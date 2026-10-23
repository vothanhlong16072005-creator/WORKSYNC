# 08 — Feature M5: Họp Trực Tuyến WebRTC, Live STT & AI Gemini

> **Module:** `backend/src/meetings/` — 14 file
> **Frontend:** `frontend/src/features/meetings/` — 29 file
> **Đây là module phức tạp nhất, nhiều kỹ thuật nhất — nên học kỹ.**

---

## 1. Bối Cảnh

Google Meet / Zoom là sản phẩm đóng, không tích hợp được với hệ thống quản lý dự án nội bộ, không sinh biên bản AI, không sinh Action Item gán thẳng vào Kanban.

**Mục tiêu WorkSync:** phòng họp đủ chức năng cơ bản + **biên bản AI tự động** + **Action Item → Task 1-click**.

---

## 2. Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────┐
│  CLIENT (React)                                         │
│  ┌──────────────────┐  ┌────────────────────┐          │
│  │ PreMeetingPage   │  │ MeetingRoomPage    │          │
│  │ - test mic/cam   │  │ - PersistentCall   │          │
│  │ - device picker  │  │   Manager (PiP)    │          │
│  └──────────────────┘  └─────────┬──────────┘          │
│                                    │                     │
│  ┌──────────────────┐  ┌─────────▼──────────┐          │
│  │ useLiveTranscription│ │ useWebRTCPeer      │         │
│  │ (Web Speech API)  │  │ (RTCPeerConnection)│         │
│  └─────────┬────────┘  └─────────┬──────────┘          │
└────────────┼─────────────────────┼─────────────────────┘
             │ Socket.IO            │ Socket.IO
             │ (namespace /meetings) │
┌────────────▼─────────────────────▼─────────────────────┐
│  SERVER (NestJS)                                        │
│  ┌──────────────────────────────────────────────┐      │
│  │ MeetingsGateway (501 dòng)                   │      │
│  │  - Signaling relay: offer/answer/ice-candidate│     │
│  │  - roomParticipants: Map<meetingId, Map<socketId, P>> │
│  │  - roomChatHistory: Map<meetingId, Message[]> │      │
│  │  - Transcript chunk streaming                │      │
│  └──────────────────┬───────────────────────────┘      │
│                     │                                    │
│  ┌──────────────────▼───────────────────────────┐      │
│  │ MeetingsService (690) — CRUD, RSVP, export    │      │
│  │ MeetingAiService (536) — Gemini 1.5 Flash      │      │
│  │ MeetingsAccessService (181) — RBAC             │      │
│  └──────────────────┬───────────────────────────┘      │
└─────────────────────┼─────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   PostgreSQL    Gemini API    Documents
   (transcript)  (summary)     (biên bản)
```

---

## 3. WebRTC là Gì? (Giải thích cho giáo viên)

### 3.1 Bối cảnh

**WebRTC** (Web Real-Time Communication) là chuẩn web cho truyền media (audio/video) thời gian thực giữa 2 browser.

**Mô hình truyền thẳng (Peer-to-Peer):**
```
Browser A  ←── media trực tiếp ──→  Browser B
    │                                      │
    └──── signaling (Socket.IO) ───────────┘
         (chỉ trao đổi thông tin kết nối)
```

**Khác biệt mấu chốt:**
- **Media** (video/audio) đi **trực tiếp** A ↔ B, **không** qua server
- **Server** chỉ làm nhiệm vụ **signaling** (giới thiệu: "A muốn nói chuyện với B, đây là thông tin kết nối")

### 3.2 3 Bước thiết lập kết nối

```
[1] OFFER  — người khởi tạo tạo "offer" (đề nghị kết nối) + gửi qua signaling
[2] ANSWER — người nhận tạo "answer" (chấp nhận) + gửi lại
[3] ICE CANDIDATE — trao đổi "đường có thể đi" để tìm đường nhanh nhất
```

**ICE (Interactive Connectivity Establishment):** tìm đường đi tối ưu giữa 2 máy — UDP trực tiếp, hoặc qua TURN relay nếu mạng chặn UDP.

**STUN server** (`stun:stun.l.google.com:19302`): cho client biết IP public của mình.
**TURN server**: relay trung gian khi client NAT chặn hoàn toàn. *Hiện tại dự án **chưa cấu hình TURN** — đây là hạn chế cần nhận biết.*

### 3.3 Signaling trong dự án

```typescript
// backend/src/meetings/meetings.gateway.ts
@SubscribeMessage('offer')
handleOffer(@ConnectedSocket() client: Socket, @MessageBody() payload: {
  targetSocketId: string; offer: any; fromUser: ClientUserData;
}) {
  this.server.to(payload.targetSocketId).emit('offer', {
    offer: payload.offer,
    fromSocketId: client.id,
    fromUser: payload.fromUser,
  });
}

@SubscribeMessage('answer') { /* giống offer */ }
@SubscribeMessage('ice-candidate') { /* giống offer */ }
```

**Server chỉ "chuyển tiếp" (relay), không đọc nội dung SDP.** Nó là "bảng tin" chứ không phải trung gian media.

---

## 4. ⭐ Vấn Đề "Glare" & Giải Pháp Deterministic Initiator

### 4.1 Vấn đề

Cả 2 người cùng vào phòng → **cùng tạo offer** → 2 offer xung đột → cả 2 bên báo lỗi "negotiation failed" → không ai thấy ai.

Đây là tình huống kinh điển trong WebRTC, tên gọi **"glare"**.

### 4.2 Giải pháp — So sánh ID để quyết định ai khởi tạo

```typescript
// frontend/src/features/meetings/hooks/useWebRTCPeer.ts
/** Deterministic initiator: Peer có id nhỏ hơn sẽ chủ động tạo offer */
const shouldInitiate = useCallback(
  (remoteUserId: string): boolean => {
    if (!remoteUserId || remoteUserId === self.id) return false;
    return self.id < remoteUserId;      // ★ so sánh chuỗi ID
  },
  [self.id],
);
```

**Cơ chế:**
```
User A có id "abc123"
User B có id "xyz789"

"abc123" < "xyz789" → TRUE  → A là initiator → A tạo offer
"xyz789" < "abc123" → FALSE → B là answerer → B chờ offer
```

**Tính chất của giải pháp này:**
| Yêu cầu | Đạt? |
|---------|------|
| Xác định | ✅ Luôn có đúng 1 initiator |
| Không cần điều phối | ✅ Chỉ cần so sánh ID |
| Không cần server | ✅ Hoạt động kể cả khi server restart |
| Công bằng | ⚠️ Luôn người có ID nhỏ hơn — nhưng **không quan trọng** về mặt nghiệp vụ |

**Đây là kỹ thuật quan trọng nhất của module WebRTC** — nên giải thích kỹ khi giáo viên hỏi.

---

## 5. ⭐ BUG-1: Late Joiner Không Thấy Camera

### 5.1 Triệu chứng

> "cuộc họp diễn ra người vào sau không thấy camera của người vào trước"

### 5.2 Nguyên nhân gốc

Khi User B vào sau User A:
1. B gửi `join-room` → server trả `room-users` (danh sách A)
2. B tạo PC đến A và gửi `offer`
3. **NHƯNG**: A không gửi `offer` ngược lại, và **A chưa bao giờ gửi local track đến B**

**Vấn đề cốt lõi:** trong WebRTC, media chỉ chạy **một chiều** cho tới khi có `addTrack` + negotiation tương ứng. Nếu A không "chủ động" gửi track của mình cho B, B không bao giờ nhận được video của A.

### 5.3 Giải pháp trong code — `ensurePeer` + `ontrack`

```typescript
// useWebRTCPeer.ts — ensurePeer()
const ensurePeer = useCallback((remoteSocketId, meta): RTCPeerConnection => {
  pcCacheRef.current.set(remoteSocketId, meta.userId);

  // ① REUSE — không tạo PC thứ 2 cho cùng 1 peer
  const existingPc = pcsRef.current.get(remoteSocketId);
  if (existingPc && existingPc.connectionState !== 'closed') {
    return existingPc;
  }

  // ② Tạo PC mới
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  });
  pcsRef.current.set(remoteSocketId, pc);

  // ③ ★ Gắn local tracks (camera + mic) — đây là thứ làm A gửi media cho B
  if (localCamStream) {
    const camTrack = localCamStream.getVideoTracks()[0];
    const micTrack = localCamStream.getAudioTracks()[0];
    if (camTrack) {
      const camStream = new MediaStream([camTrack]);
      try {
        Object.defineProperty(camStream, 'id', { value: `${CAM_STREAM_PREFIX}-${self.id}` });
      } catch { /* Fallback if property define fails */ }
      pc.addTrack(camTrack, camStream);
    }
    if (micTrack) {
      pc.addTrack(micTrack, localCamStream);
    }
  }

  // ④ Screen share — addTrack riêng, KHÔNG replaceTrack
  if (localScreenStream) {
    const screenTrack = localScreenStream.getVideoTracks()[0];
    if (screenTrack) {
      const screenStream = new MediaStream([screenTrack]);
      try {
        Object.defineProperty(screenStream, 'id', { value: `${SCREEN_STREAM_PREFIX}-${self.id}` });
      } catch { /* Fallback */ }
      pc.addTrack(screenTrack, screenStream);
    }
  }

  // ⑤ ICE candidates
  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('ice-candidate', {
        targetSocketId: remoteSocketId,
        candidate: event.candidate.toJSON(),
      });
    }
  };

  // ⑥ ★ Nhận remote tracks
  pc.ontrack = (event) => { /* xem mục 6 */ };

  // ⑦ Connection state changes
  pc.onconnectionstatechange = () => { /* update state */ };

  // ⑧ Đăng ký peer object ban đầu
  setPeersBoth((prev) => { /* ... */ });

  return pc;
}, [localCamStream, localScreenStream, self.id, socket, setPeersBoth]);
```

### 5.4 3 điều kiện cần đồng thời để late joiner thấy camera

```
✅ ① ensurePeer() LUÔN addTrack local stream (kể cả khi mình là answerer)
✅ ② ensurePeer() REUSE PC đã có — không tạo PC thứ 2 làm mất track
✅ ③ ontrack() lưu stream vào peers state để UI render
```

**Đặc biệt quan trọng:** điều kiện ① phải đúng cho **cả 2 chiều**. Vì vậy `ensurePeer` luôn gắn track, **không phân biệt ai là initiator**. Initiator chỉ khác ở chỗ **ai chủ động gửi offer**.

### 5.5 Sơ đồ luồng late joiner

```
User A (đã vào, đang stream)        Server              User B (vào sau)
      │                              │                       │
      │                              │◄── join-room(B) ─────│
      │◄───── room-users([A]) ───────│                       │
      │                              │                       │
      │                              │                       │ ensurePeer(A)
      │                              │                       │ → addTrack(local)
      │                              │                       │ → createOffer()
      │                              │◄──── offer ───────────│
      │◄──── offer (relay) ──────────│                       │
      │ createAnswer()               │                       │
      │ addTrack(local) ← ★          │                       │
      │ setLocalDescription()        │                       │
      │──────── answer ─────────────►│────── answer ────────►│
      │                              │                       │ setRemoteDescription
      │◄──── ice-candidate ──────────│◄── ice-candidate ─────│
      │                              │                       │
      │ ★ A's track đến B            │                       │ ★ B's track đến A
      │◄─────────────────────────────┼──────────────────────►│
      │   ontrack: camStream = stream│                       │   ontrack: camStream = stream
```

**★ Dòng quan trọng nhất: `addTrack(local)` của B được gửi tới A khi A tạo answer.**

---

## 6. ⭐ BUG-2 & BUG-3: Phân Biệt Camera vs Screen Share

### 6.1 Triệu chứng

> "khi share màn hình thì chỉ có người share thấy còn người tham gia thì không thể thấy được cả cam và màn hình chia sẻ"

### 6.2 Nguyên nhân gốc

Có **2 loại video track** từ mỗi peer:
1. Track camera (từ `getUserMedia({ video: true })`)
2. Track màn hình (từ `getDisplayMedia()`)

Nếu cả 2 dùng chung 1 `MediaStream` hoặc dùng `replaceTrack()` → khi bắt đầu share, **track camera bị thay thế** → người khác mất hình camera, và track màn hình không được phân biệt để hiển thị đúng chỗ.

### 6.3 Giải pháp — Prefix ID trên `MediaStream`

```typescript
export const CAM_STREAM_PREFIX = 'worksync-cam';
export const SCREEN_STREAM_PREFIX = 'worksync-screen';
```

**Khi tạo stream:**
```typescript
const camStream = new MediaStream([camTrack]);
try {
  Object.defineProperty(camStream, 'id', { value: `${CAM_STREAM_PREFIX}-${self.id}` });
} catch {
  // Fallback if property define fails
}
pc.addTrack(camTrack, camStream);
```

**Khi nhận track:**
```typescript
pc.ontrack = (event) => {
  const track = event.track;
  const stream = event.streams[0] ?? new MediaStream([track]);
  const streamId = stream.id || '';
  const isScreen = streamId.startsWith(SCREEN_STREAM_PREFIX);   // ★ phân biệt

  track.onended = () => {
    setPeersBoth((prev) => {
      const next = new Map(prev);
      const existing = next.get(remoteSocketId);
      if (existing) {
        next.set(remoteSocketId, {
          ...existing,
          [isScreen ? 'screenStream' : 'camStream']: null,   // ★ đúng field
          isScreenSharing: isScreen ? false : existing.isScreenSharing,
        });
      }
      return next;
    });
  };

  setPeersBoth((prev) => {
    const next = new Map(prev);
    const existing = next.get(remoteSocketId);
    const target = isScreen ? 'screenStream' : 'camStream';    // ★ đúng field

    if (!existing) {
      next.set(remoteSocketId, {
        socketId: remoteSocketId,
        userId: pcCacheRef.current.get(remoteSocketId) ?? meta.userId,
        name: meta.name || 'Đồng nghiệp',
        avatar: meta.avatar,
        camStream: isScreen ? null : stream,
        screenStream: isScreen ? stream : null,
        audioEnabled: meta.audioEnabled ?? true,
        videoEnabled: meta.videoEnabled ?? true,
        isScreenSharing: isScreen || (meta.screenSharing ?? false),
        connectionState: pc.connectionState,
      });
    } else {
      const updated: RemotePeer = {
        ...existing,
        [target]: track.readyState === 'ended' ? null : stream,
        connectionState: pc.connectionState,
        isScreenSharing: isScreen ? track.readyState !== 'ended' : existing.isScreenSharing,
      };
      next.set(remoteSocketId, updated);
    }
    return next;
  });
};
```

### 6.4 Tại sao `Object.defineProperty`?

`MediaStream.id` là **read-only** theo spec. Không thể gán trực tiếp:
```typescript
camStream.id = 'worksync-cam-abc';   // ❌ TypeError: Cannot assign to read only property
```

→ Dùng `Object.defineProperty` để override property (chỉ đọc, có configurable).

**Fallback `try/catch`** vì một số browser có thể chặn.

### 6.5 `attachScreenShare` — Thêm track + renegotiate

```typescript
const attachScreenShare = useCallback(async (screenStream: MediaStream) => {
  const screenTrack = screenStream.getVideoTracks()[0];
  if (!screenTrack) return;

  for (const [remoteSocketId, pc] of pcsRef.current.entries()) {
    // ① Tạo stream riêng cho screen
    const namedScreenStream = new MediaStream([screenTrack]);
    try {
      Object.defineProperty(namedScreenStream, 'id', {
        value: `${SCREEN_STREAM_PREFIX}-${self.id}`,
      });
    } catch { /* Fallback */ }

    (screenTrack as any).__worksyncKind = SCREEN_STREAM_PREFIX;
    pc.addTrack(screenTrack, namedScreenStream);   // ★ addTrack, KHÔNG replaceTrack

    // ② Renegotiate với peer này
    const meta = peersRef.current.get(remoteSocketId);
    await makeOfferTo(remoteSocketId, {
      userId: meta?.userId ?? 'unknown',
      // ...
    });
  }
}, [self.id, makeOfferTo]);
```

**`addTrack` vs `replaceTrack`:**

| | `replaceTrack` | `addTrack` |
|---|---|---|
| Thay thế track cũ | ✅ Có | ❌ Không |
| Giữ camera khi share | ❌ Mất camera | ✅ Giữ cả 2 |
| Cần renegotiate | Có | Có |

→ **Dùng `addTrack`** để giữ đồng thời camera + màn hình chia sẻ.

### 6.6 2 `videoRef` — Fix Mini Widget

```tsx
// PersistentCallManager.tsx
<video ref={localVideoRef} autoPlay muted playsInline className="..." />     // ← camera
<video ref={localScreenVideoRef} autoPlay muted playsInline className="..." /> // ← screen
<video ref={miniVideoRef} autoPlay muted playsInline className="..." />        // ← widget thu nhỏ
```

**3 ref, 3 vị trí hiển thị** → cùng 1 stream có thể render ở nhiều nơi.

---

## 7. BUG-4: Chat Phòng Họp & Người Vào Sau

### 7.1 Vấn đề

> "tin nhắn cũng vậy" — người vào sau không thấy tin nhắn đã gửi.

### 7.2 Giải pháp — `roomChatHistory` trong RAM

```typescript
// meetings.gateway.ts
private readonly roomChatHistory = new Map<
  string,
  Array<{ id: string; meetingId: string; text: string; sender: ClientUserData; createdAt: string }>
>();
```

**Ghi tin nhắn:**
```typescript
@SubscribeMessage('chat-message')
handleChatMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: {...}) {
  const messageData = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    meetingId: payload.meetingId,
    text: payload.text,
    sender: payload.sender,
    attachment: payload.attachment,
    createdAt: new Date().toISOString(),
  };

  if (!this.roomChatHistory.has(payload.meetingId)) {
    this.roomChatHistory.set(payload.meetingId, []);
  }
  const history = this.roomChatHistory.get(payload.meetingId)!;
  history.push(messageData);
  if (history.length > 200) history.shift();   // ★ giới hạn 200 tin

  this.server.to(payload.meetingId).emit('chat-message', messageData);
}
```

**Gửi cho người vào sau:**
```typescript
// Trong handleJoinRoom():
const chatHistory = this.roomChatHistory.get(meetingId) || [];
client.emit('chat-history', { messages: chatHistory });
```

**Có endpoint yêu cầu lại:**
```typescript
@SubscribeMessage('request-chat-history')
handleRequestChatHistory(@ConnectedSocket() client: Socket, @MessageBody() payload: { meetingId: string }) {
  const history = this.roomChatHistory.get(payload.meetingId) || [];
  client.emit('chat-history', { messages: history });
}
```

### 7.3 Đánh đổi của cách lưu trong RAM

| Ưu | Nhược |
|-----|-------|
| Nhanh, không query DB | Mất khi server restart |
| Đơn giản | Không dùng được cho chat chính (M9) |

> **Phân biệt quan trọng:** chat **phòng họp** lưu trong RAM (tạm, theo phiên họp). Chat **chính** (M9) lưu trong **PostgreSQL** (`ChatMessage` model). Đây là 2 hệ thống khác nhau, cần nói rõ khi giáo viên hỏi.

**Giới hạn 200 tin** — tránh memory leak khi họp kéo dài.

---

## 8. Live Speech-to-Text Tiếng Việt

### 8.1 Công nghệ — Web Speech API

```typescript
// frontend/src/features/meetings/hooks/useLiveTranscription.ts
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
```

**Lưu ý:** `webkitSpeechRecognition` là prefix của Chrome/Edge. Firefox/Safari chưa hỗ trợ → cần fallback.

### 8.2 Cấu hình nhận diện tiếng Việt

```typescript
const recognition = new SpeechRecognition();
recognition.lang = 'vi-VN';              // ★ nhận diện tiếng Việt
recognition.continuous = true;           // ★ không dừng sau khi nói
recognition.interimResults = true;       // ★ trả kết quả tạm thời
```

| Thuộc tính | Ý nghĩa | Vì sao cần |
|-------------|----------|------------|
| `lang` | Ngôn ngữ nhận diện | `'vi-VN'` để nhận dấu tiếng Việt đúng |
| `continuous` | Không tự dừng | Nói nhiều câu liên tục không bị ngắt |
| `interimResults` | Trả kết quả tạm | Hiển thị caption ngay khi đang nói |

### 8.3 "Smart Sentence Buffer" — Gom câu hoàn chỉnh

**Vấn đề:** Web Speech API trả về từng mảnh nhỏ ("Xin chào", "mọi người", "hôm nay"). Nếu gửi mỗi mảnh lên server → rất nhiều record rác, AI tóm tắt kém.

**Giải pháp:** buffer cho đến khi câu đủ dài (≥15 từ) hoặc gặp dấu câu.

```typescript
// useLiveTranscription.ts (rút gọn)
const MIN_SENTENCE_WORDS = 15;

const flushSentence = useCallback((finalText: string, speakerName: string) => {
  if (!finalText.trim()) return;

  const wordCount = finalText.trim().split(/\s+/).length;
  const hasPunctuation = /[.!?;:]/.test(finalText.trim());

  sentenceBuffer.current += (sentenceBuffer.current ? ' ' : '') + finalText.trim();

  // ★ Điều kiện flush: đủ từ HOẶC kết thúc bằng dấu câu
  if (wordCount >= MIN_SENTENCE_WORDS || hasPunctuation) {
    const sentence = sentenceBuffer.current.trim();
    sentenceBuffer.current = '';

    socket?.emit('meeting:transcript-chunk', {
      meetingId,
      speakerId: userId,
      speakerName,
      text: sentence,
      timestamp: new Date().toISOString(),
    });
  }
}, [socket, meetingId, userId]);
```

**Ý nghĩa:**
- ≥15 từ → đủ ý nghĩa → gửi
- Có dấu `.!?;:` → câu kết thúc → gửi ngay (không chờ đủ 15 từ)

**Kết quả:** transcript sạch, đúng ranh giới câu → AI tóm tắt chính xác hơn nhiều.

### 8.4 Watchdog — Tự khởi động lại

Web Speech API **hay tự dừng** (khi im lặng lâu, khi tab mất focus, do browser tiết kiệm tài nguyên).

```typescript
// Watchdog: nếu recognition không hoạt động sau N giây → restart
const watchdog = setInterval(() => {
  if (!recognitionStarted) {
    console.warn('[STT] Watchdog restarting recognition');
    recognition.start();
    recognitionStarted = true;
  }
}, 5000);
```

**Đây chính là nguồn gốc của hiện tượng "nhận diện tiếng Việt yếu"** mà user báo. Giải pháp đầy đủ nằm trong `docs/M5.3-WEBRTC-FIX-PLAN.md`.

### 8.5 Lưu transcript — Mảnh độc lập

```prisma
model MeetingTranscriptChunk {
  meetingId   String
  speakerId   String
  speakerName String
  speakerRole String?
  text        String   @db.Text
  timestamp   DateTime @default(now())
  @@index([meetingId, timestamp])
}
```

**Tại sao mảnh độc lập, không phải 1 chuỗi lớn?**
- Nhiều người nói đồng thời → nếu ghi vào 1 chuỗi sẽ **ghi đè lẫn nhau** (race condition)
- Mảnh độc lập → mỗi người 1 chuỗi riêng → ghép lại theo `timestamp`

### 8.6 Ghép transcript cho AI

```typescript
// meeting-ai.service.ts
const chunks = await this.prisma.meetingTranscriptChunk.findMany({
  where: { meetingId },
  orderBy: { timestamp: 'asc' },
});

let transcriptText = '';
if (chunks.length > 0) {
  transcriptText = chunks.map((c) => {
    const time = new Date(c.timestamp).toTimeString().split(' ')[0];
    return `[${time}] ${c.speakerName}: ${c.text}`;   // ← định dạng có timestamp + speaker
  }).join('\n');
}
```

**Format `[HH:mm:ss] Tên: Lời nói`** → Gemini hiểu ai nói gì lúc nào → trích xuất `assigneeId` chính xác.

### 8.7 Sync cho người vào sau

```typescript
// meetings.gateway.ts — handleJoinRoom()
const minute = await this.prisma.meetingMinute.findUnique({
  where: { meetingId },
  select: { isTranscribing: true },
});
const recentChunks = await this.prisma.meetingTranscriptChunk.findMany({
  where: { meetingId },
  orderBy: { timestamp: 'asc' },
  take: 300,          // ← 300 chunk gần nhất
});

client.emit('meeting:sync-state', {
  isTranscribing: minute?.isTranscribing ?? false,
  transcripts: recentChunks.map((c) => ({
    id: c.id, speakerId: c.speakerId, speakerName: c.speakerName,
    speakerRole: c.speakerRole, text: c.text, timestamp: c.timestamp.toISOString(),
  })),
});
```

---

## 9. ⭐ AI Tóm Tắt — Gemini 1.5 Flash

### 9.1 Luồng xử lý

```
[1] POST /api/meetings/:id/ai-summary/generate
     ↓
[2] Lấy transcript chunks từ DB → ghép thành text có timestamp
     ↓
[3] Fallback: nếu chưa có chunks → dùng meeting.minutes.content
     ↓
[4] Kiểm tra độ dài ≥ 30 ký tự → nếu không thì báo lỗi rõ ràng
     ↓
[5] Lấy API key: systemConfig.geminiApiKey || process.env.GEMINI_API_KEY
     ↓
[6] Gọi Gemini 1.5 Flash (có fallback model)
     ↓
[7] Lỗi / không có key → generateHeuristicSummary() (heuristic fallback)
     ↓
[8] Lưu vào MeetingMinute (aiSummary, actionItems, decisions, risksAndQuestions)
     ↓
[9] Cập nhật Document liên kết (nếu có)
     ↓
[10] Trả về client
```

### 9.2 Code thật (`meeting-ai.service.ts`)

```typescript
async generateSummary(meetingId: string, options?: { language?: 'VI' | 'EN' }): Promise<MeetingSummaryResult> {
  const language = options?.language || 'VI';

  const meeting = await this.prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      minutes: true,
      attendees: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
    },
  });

  if (!meeting) throw new NotFoundException(`Cuộc họp ${meetingId} không tồn tại`);

  // ① Transcript chunks
  const chunks = await this.prisma.meetingTranscriptChunk.findMany({
    where: { meetingId },
    orderBy: { timestamp: 'asc' },
  });

  let transcriptText = '';
  if (chunks.length > 0) {
    transcriptText = chunks.map((c) => {
      const time = new Date(c.timestamp).toTimeString().split(' ')[0];
      return `[${time}] ${c.speakerName}: ${c.text}`;
    }).join('\n');

    await this.prisma.meetingMinute.upsert({
      where: { meetingId },
      create: { meetingId, content: transcriptText, rawTranscript: transcriptText, isTranscribing: false },
      update: { rawTranscript: transcriptText, isTranscribing: false },
    });
  }

  const sourceContent = transcriptText || meeting.minutes?.content || '';

  if (sourceContent.trim().length < 30) {
    throw new BadRequestException(
      'Chưa có dữ liệu lời thoại được ghi lại từ cuộc họp. Vui lòng bật mic, bấm "Bắt đầu ghi AI" và phát biểu để hệ thống nhận diện giọng nói trước khi tạo biên bản.',
    );
  }

  const participants: ParticipantInfo[] = meeting.attendees.map((a) => ({
    id: a.user.id, name: a.user.name, email: a.user.email, role: a.user.role,
  }));

  // ② API key
  const systemConfig = await this.prisma.systemConfig.findFirst();
  const apiKey = systemConfig?.geminiApiKey || process.env.GEMINI_API_KEY;

  let result: MeetingSummaryResult;

  if (apiKey && apiKey !== 'your_gemini_api_key_here_paste_here' && process.env.NODE_ENV !== 'test') {
    try {
      result = await this.callGemini(apiKey, sourceContent, {
        title: meeting.title, participants, language,
      });
    } catch (error) {
      this.logger.warn(`Gemini API failed for meeting ${meetingId}: ${(error as Error).message}. Using heuristic fallback.`);
      result = this.generateHeuristicSummary(sourceContent, { title: meeting.title, participants, language });
    }
  } else {
    this.logger.debug(`No valid Gemini API key, using heuristic for meeting ${meetingId}`);
    result = this.generateHeuristicSummary(sourceContent, { title: meeting.title, participants, language });
  }

  result.rawTranscript = transcriptText || null;

  await this.saveSummary(meetingId, result);
  await this.updateLinkedDocumentSummary(meetingId, result.summary);

  return result;
}
```

### 9.3 4 cơ chế bảo vệ (Resilience)

| Cơ chế | Vị trí | Tác dụng |
|---------|--------|----------|
| **API key thứ 2** | `systemConfig.geminiApiKey \|\| process.env.GEMINI_API_KEY` | Admin cấu hình trong DB, không cần sửa .env |
| **Kiểm tra key giả** | `apiKey !== 'your_gemini_api_key_here_paste_here'` | Chặn key placeholder |
| **Chặn gọi trong test** | `process.env.NODE_ENV !== 'test'` | Unit test không gọi API thật (tiết kiệm + ổn định) |
| **Heuristic fallback** | `generateHeuristicSummary()` | Không có key / API lỗi → vẫn trả kết quả dạng đơn giản |

**Multi-Model Fallback** (trong `callGemini`):
```typescript
try {
  // gemini-1.5-flash
} catch {
  // gemini-1.5-flash-8b hoặc model dự phòng
}
```

### 9.4 Cấu trúc output — 4 phần

```typescript
export interface MeetingSummaryResult {
  summary: string;                                    // ← tóm tắt điều hành
  actionItems: ActionItem[];                          // ← việc cần làm
  decisions: string[];                                // ← quyết định đạt được
  risksAndQuestions: { risks: string[]; openQuestions: string[] };
  model: string;
  tokensUsed?: number;
  generatedAt: Date;
  rawTranscript?: string | null;
}

export interface ActionItem {
  task: string;
  assignee?: string | null;
  assigneeId?: string | null;      // ★ map về user thật trong DB
  deadline?: string | null;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence?: number;             // ★ AI tự đánh giá độ tin cậy
}
```

### 9.5 Participant Attribution — Gán đúng người

**Kỹ thuật quan trọng:** đưa danh sách attendees vào prompt để Gemini **map tên → userId**:

```typescript
const participants: ParticipantInfo[] = meeting.attendees.map((a) => ({
  id: a.user.id, name: a.user.name, email: a.user.email, role: a.user.role,
}));
// → truyền vào prompt Gemini
```

Kết quả AI trả `assigneeId: "cmv123abc"` → Action Item tạo được Task với đúng người được giao.

**`confidence`** — AI tự đánh giá. Nếu `< 0.7` thì UI có thể highlight "cần xác nhận" thay vì tự tạo task.

### 9.6 Action Item → Task 1-Click

Component: `MeetingAiDrawer.tsx`

```
┌────────────────────────────────────────┐
│ Action Items (3)                       │
│ ┌────────────────────────────────────┐ │
│ │ ☐ Nâng cấp giao diện phòng họp    │ │
│ │   👤 Long Võ  📅 23/10  🔴 HIGH     │ │
│ │                          [+ Tạo Task]│ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

**Nút "+ Tạo Task"** → POST `/api/tasks` với `assigneeId` + `dueDate` + `priority` từ AI → task xuất hiện ngay trên Kanban.

**Đây là điểm "AI-augmented" mạnh nhất của hệ thống:** AI đề xuất → người quyết định → tích hợp vào công việc thật.

### 9.7 Export biên bản ra Document

```typescript
async exportToDocument(meetingId: string, userId: string) {
  // Tạo Document với:
  //   scope = project ? 'PROJECT' : department ? 'DEPARTMENT' : 'COMPANY'
  //   type = 'MEETING_MINUTES'
  //   linkedMeetingId = meetingId
  //   content = AI summary dạng rich text
}
```

---

## 10. Xuất Báo Cáo Word & CSV

### 10.1 Word (.doc) — Chuẩn văn bản hành chính

```typescript
// backend/src/meetings/meetings.service.ts hoặc document-export.service.ts
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } from 'docx';
```

**Cấu trúc biên bản:**
```
        BIÊN BẢN HỌP
Số: .../BC-HĐ-DN                    Đà Nẵng, ngày ... tháng ... năm ...

I. THÀNH PHẦN THAM DỰ
   Bảng: Họ tên | Chức vụ | Đơn vị | Ghi chú

II. NỘI DUNG CUỘC HỌP
   ...

III. KẾT LUẬN VÀ QUYẾT ĐỊNH
   ...

                     Đ�I DIỆN PHÍA CÔNG TY
                          (Ký, ghi rõ họ tên)
```

### 10.2 CSV — Có UTF-8 BOM

```typescript
const BOM = '\uFEFF';   // ★ bắt buộc để Excel hiển thị đúng tiếng Việt
```

**Đây là bug thực tế đã sửa** (commit `2912a84`). Không có BOM → Excel Windows mở file tiếng Việt bị lỗi font.

---

## 11. `PersistentCallManager` — Widget Nổi & Mini View

### 11.1 Vấn đề

Khi user rời trang phòng họp (điều hướng sang dashboard) → cuộc họp vẫn chạy → cần widget nổi để quay lại.

### 11.2 Kiến trúc

```tsx
// App.tsx — mount ở cấp CAO NHẤT
<BrowserRouter>
  <PersistentCallManager />
  <Routes>...</Routes>
</BrowserRouter>
```

```tsx
// PersistentCallManager.tsx (rút gọn)
export const PersistentCallManager: React.FC = () => {
  const { activeMeeting, clearActiveMeeting } = useActiveCallStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!activeMeeting) return null;
  if (location.pathname.startsWith(`/meetings/${activeMeeting.id}/report`)) return null;

  const isFullRoomRoute = location.pathname === `/meetings/${activeMeeting.id}/room`;

  return (
    <ActiveCallSession
      meeting={activeMeeting}
      isFullView={isFullRoomRoute}
      onMinimize={() => navigate('/dashboard')}
      onMaximize={() => navigate(`/meetings/${activeMeeting.id}/room`)}
      onLeave={() => { clearActiveMeeting(); navigate('/meetings'); }}
      onMeetingEnded={() => { clearActiveMeeting(); navigate(`/meetings/${activeMeeting.id}/report`); }}
    />
  );
};
```

### 11.3 `useActiveCallStore` (12 dòng — store nhỏ nhất)

```typescript
interface ActiveCallState {
  activeMeeting: { id: string; title: string; startedAt: string } | null;
  setActiveMeeting: (m: ...) => void;
  clearActiveMeeting: () => void;
}
```

**Có `persist`** → F5 không mất cuộc họp đang chạy.

### 11.4 `createPortal` — Fix nút kết thúc trong mini widget

```tsx
// Nút "Kết thúc cuộc gọi" trong widget thu nhỏ
import { createPortal } from 'react-dom';

createPortal(
  <button onClick={handleEndCall}>Kết thúc</button>,
  document.body
);
```

**Vấn đề đã gặp:** widget mini nằm trong container có `overflow: hidden` hoặc `z-index` thấp → nút bị che. `createPortal` render ra `document.body` → không bị ảnh hưởng bởi CSS của container cha.

### 11.5 Dọn dẹp camera khi kết thúc — BUG-5

> "khi kết thúc cuộc họp camera vẫn mở"

**Nguyên nhân:** `getUserMedia` tạo MediaStreamTrack → **đèn camera vẫn sáng** nếu không gọi `track.stop()`.

**Fix:**
```typescript
const stopAllTracks = useCallback((stream: MediaStream | null) => {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    track.stop();          // ★ dừng track → tắt camera/mic, đèn tắt
  });
}, []);

// Khi rời phòng hoặc kết thúc cuộc họp:
stopAllTracks(localCamStream);
stopAllTracks(localScreenStream);
```

**`track.stop()`** là API duy nhất để **thực sự** giải phóng thiết bị phần cứng. Chỉ gán `null` vào state không đủ.

**Ngoài ra** cần đóng `RTCPeerConnection`:
```typescript
const removePeer = useCallback((remoteSocketId: string) => {
  const pc = pcsRef.current.get(remoteSocketId);
  pc?.close();                            // ★ đóng PC → giải phóng kết nối
  pcsRef.current.delete(remoteSocketId);
  pcCacheRef.current.delete(remoteSocketId);
  setPeersBoth((prev) => { /* xóa khỏi state */ });
}, [setPeersBoth]);
```

---

## 12. RBAC Meetings

| Hành động | Role |
|-----------|------|
| Tạo cuộc họp | PM, DEPT_HEAD, HR, ADMIN |
| Tham gia họp | Attendee (đã RSVP) |
| Kết thúc họp cho tất cả | Host (creator), PM, ADMIN |
| Tạo AI summary | Host, PM, ADMIN |
| Xuất báo cáo | Host, PM, ADMIN |
| Xem biên bản | ALL (nếu là attendee) |

```typescript
// meetings.gateway.ts — handleEndMeetingForAll
const canEnd =
  meeting.createdById === userId ||
  meeting.attendees.some((a) => a.userId === userId && (a.role === 'HOST' || ...));
```

---

## 13. Hạn Chế & Hướng Mở Rộng

| Hạn chế | Nguyên nhân | Hướng mở rộng |
|---------|-------------|---------------|
| Mesh O(N²) | Mỗi peer tải N-1 stream | **SFU** (mediasoup, LiveKit) — server chuyển tiếp stream |
| Chưa có TURN server | Mạng chặn UDP → không kết nối được | Thêm coturn vào `iceServers` |
| Chat phòng họp trong RAM | Mất khi restart | Lưu vào `ChatMessage` (giống M9) |
| Web Speech API chỉ Chrome/Edge | `webkitSpeechRecognition` | Fallback sang Whisper API / server-side STT |
| STT đôi lúc không nhận diện | Watchdog chưa hoàn hảo | Tối ưu buffer + restart thông minh |
| Chưa có recording | — | `MediaRecorder` + lưu S3 |

---

## 14. Câu Hỏi Thường Gặp

**Q: WebRTC hoạt động thế nào?**
> Media đi **trực tiếp** giữa các browser, không qua server. Server chỉ làm **signaling** — trao đổi SDP offer/answer và ICE candidate để 2 bên tìm được đường đi tối ưu. Ưu điểm: server không phải xử lý/xử lý lại media → chi phí băng thông server thấp, độ trễ thấp.

**Q: Glare là gì và giải pháp?**
> Khi cả 2 peer cùng tạo offer → xung đột. Dự án dùng **deterministic initiator**: so sánh `self.id < remoteUserId` → ai có ID nhỏ hơn là initiator. Luôn chỉ có 1 người tạo offer, không cần server điều phối.

**Q: Late joiner không thấy camera — nguyên nhân?**
> Vì `addTrack` local stream phải được gọi cho **cả 2 chiều**, kể cả bên nhận offer. `ensurePeer()` luôn gắn track bất kể vai trò → đảm bảo late joiner nhận được media của người đã ở trước. Ngoài ra `ensurePeer` phải **reuse** `RTCPeerConnection` đã có, nếu tạo PC thứ 2 thì track cũ bị mất.

**Q: Vì sao cần prefix `worksync-cam-` / `worksync-screen-`?**
> Vì 1 peer gửi **2 track video** (camera + màn hình). `ontrack` cần biết track nào là camera, track nào là screen để render đúng chỗ. Prefix trên `MediaStream.id` là cách nhận diện — dùng `Object.defineProperty` vì `MediaStream.id` là read-only.

**Q: `addTrack` vs `replaceTrack`?**
> `replaceTrack` thay thế track cũ → khi share màn hình, camera biến mất. `addTrack` giữ cả 2 → camera + màn hình cùng hiển thị. Dự án dùng `addTrack` + renegotiate.

**Q: Live STT tiếng Việt hoạt động ra sao?**
> Web Speech API (`webkitSpeechRecognition`) với `lang='vi-VN'`, `continuous=true`, `interimResults=true`. Hook `useLiveTranscription` buffer câu (≥15 từ hoặc có dấu câu) rồi stream lên server qua Socket.IO. Server lưu vào `MeetingTranscriptChunk` (mảnh độc lập để tránh race condition khi nhiều người nói).

**Q: STT tiếng Việt bị yếu, nguyên nhân?**
> 3 nguyên nhân: (1) Web Speech API **tự dừng** khi im lặng → cần Watchdog auto-restart; (2) buffer gửi từng mảch nhỏ → transcript rác → cần Smart Sentence Buffer; (3) browser không hỗ trợ `vi-VN` tốt. Giải pháp đầy đủ nằm trong `docs/M5.3-WEBRTC-FIX-PLAN.md`.

**Q: AI tóm tắt cuộc họp thế nào?**
> Gom `MeetingTranscriptChunk` thành text có format `[HH:mm:ss] Tên: nội dung` → gửi Gemini 1.5 Flash kèm danh sách attendees → AI trả JSON gồm summary, actionItems (có `assigneeId` map về user thật), decisions, risks. Có 3 tầng fallback: multi-model, heuristic khi không có key, và báo lỗi rõ ràng khi transcript quá ngắn.

**Q: Tại sao không lưu chat phòng họp vào DB?**
> Vì chat phòng họp là **tạm thời theo phiên họp**, giới hạn 200 tin trong RAM là đủ → nhanh, không tốn DB. Chat chính (M9) cần lưu lâu dài + tìm kiếm + đọc receipt → dùng PostgreSQL. 2 hệ thống phục vụ 2 nhu cầu khác nhau.

**Q: Camera không tắt sau khi kết thúc họp?**
> Vì `getUserMedia` tạo `MediaStreamTrack` giữ quyền truy cập camera. Phải gọi `track.stop()` (không chỉ set state = null) và `pc.close()` cho mọi `RTCPeerConnection`. Đây là fix trong M5.3.

**Q: Mô hình mesh giới hạn bao nhiêu người?**
> Thực tế ~5 người/phòng. Mỗi peer tải N-1 stream → tổng băng thông ~O(N²). 10 người → mỗi người tải 9 stream. Giải pháp production: **SFU** (Selective Forwarding Unit) như mediasoup/LiveKit — server chuyển tiếp, mỗi client chỉ tải N stream (camera + screen).
