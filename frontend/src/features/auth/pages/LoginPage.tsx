import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userStr = params.get('user');
    
    if (token && userStr) {
      try {
        let user;
        try {
          user = JSON.parse(userStr);
        } catch {
          user = JSON.parse(decodeURIComponent(userStr));
        }
        setAuth(user, token);
        localStorage.setItem('token', token);
        localStorage.setItem('accessToken', token);
        window.history.replaceState({}, document.title, window.location.pathname);
        toast.success(`Chào mừng trở lại, ${user.name || user.email}!`, {
          description: 'Đăng nhập bằng tài khoản Google thành công.',
        });
        navigate('/dashboard');
      } catch (e) {
        console.error('Failed to parse user from Google Login', e);
        toast.error('Lỗi phân tích dữ liệu đăng nhập Google.');
      }
    }
  }, [setAuth, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:4000/api/auth/login', {
        email: email.trim(),
        password,
      });

      const token = response.data?.accessToken || response.data?.token;
      const user = response.data?.user;

      if (token && user) {
        setAuth(user, token);
        localStorage.setItem('token', token);
        localStorage.setItem('accessToken', token);
        toast.success(`Đăng nhập thành công!`, {
          description: `Chào mừng ${user.name || user.email} đến với WorkSync.`,
        });
        navigate('/dashboard');
      } else {
        throw new Error('Dữ liệu xác thực không hợp lệ từ máy chủ.');
      }
    } catch (error: any) {
      console.error('Login error', error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Sai email hoặc mật khẩu. Vui lòng thử lại!';
      toast.error('Đăng nhập thất bại', {
        description: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-4 antialiased bg-noise">
      {/* Bauhaus Decorative Shapes */}
      <div className="pointer-events-none absolute -top-20 -left-20 h-96 w-96 rounded-full bg-destructive/90 mix-blend-multiply" />
      <div className="pointer-events-none absolute bottom-10 right-20 h-72 w-72 bg-accent/90 mix-blend-multiply rotate-12" />
      <div className="pointer-events-none absolute top-1/3 left-1/4 h-32 w-32 border-[12px] border-primary/90 rounded-full" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 w-0 h-0 border-l-[150px] border-l-transparent border-b-[200px] border-b-primary/80 border-r-[150px] border-r-transparent -rotate-12" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bauhaus-card !bg-slate-900 border-4 border-slate-900 overflow-hidden">
          {/* Subtle Accent Blocks */}
          <div className="absolute top-0 right-0 w-16 h-16 bg-accent" />
          <div className="absolute bottom-0 left-0 w-24 h-4 bg-primary" />
          
          <CardHeader className="space-y-2 text-center pt-10 pb-6 relative z-10">
            <div className="flex justify-center mb-2">
              <img src="/logo.svg" alt="WorkSync" className="h-16 w-16 object-contain drop-shadow-md" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-white uppercase">
              WORK<span className="text-accent">SYNC</span>
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-300 uppercase tracking-widest">
              Đăng nhập hệ thống
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="relative z-10">
            <CardContent className="space-y-5 px-8 pt-2">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Email
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-none border-2 border-white bg-slate-800 px-4 text-sm text-white placeholder:text-slate-500 transition-all focus:border-accent focus:bg-slate-900 focus:ring-0"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Mật khẩu
                  </Label>
                  <a href="#" className="text-xs font-bold text-accent hover:text-white hover:underline uppercase" tabIndex={-1}>
                    Quên?
                  </a>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-none border-2 border-white bg-slate-800 px-4 pr-12 text-sm text-white placeholder:text-slate-500 transition-all focus:border-accent focus:bg-slate-900 focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-accent focus:outline-none transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 px-8 pb-10 mt-2">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-12 w-full rounded-none border-2 border-white bg-primary font-bold uppercase text-white shadow-[4px_4px_0px_0px_#fff] transition-all duration-200 hover:bg-blue-700 hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    ĐANG XỬ LÝ...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    ĐĂNG NHẬP
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>

              <div className="relative my-4 w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t-2 border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase font-bold">
                  <span className="bg-slate-900 px-4 text-slate-400">
                    HOẶC
                  </span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="outline" 
                className="h-12 w-full rounded-none border-2 border-white bg-white font-bold uppercase text-slate-900 shadow-[4px_4px_0px_0px_#fff] transition-all duration-200 hover:bg-slate-100 hover:translate-x-1 hover:translate-y-1 hover:shadow-none active:scale-[0.98]"
                onClick={() => window.location.href = 'http://localhost:4000/api/auth/google'}
              >
                <svg className="mr-3 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                  <path fill="#EA4335" d="M248 8C111 8 0 119 0 256s111 248 248 248c143 0 240-101 240-248 0-16-2-32-5-48H248v92h140c-6 33-25 61-53 80l84 65c49-45 77-111 77-189 0-148-111-248-248-248z" opacity="0"></path>
                  <path fill="#4285F4" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
                ĐĂNG NHẬP BẰNG GOOGLE
              </Button>

              <div className="text-center text-sm font-bold text-slate-400 mt-4 uppercase">
                CHƯA CÓ TÀI KHOẢN?{' '}
                <a href="/register" className="text-accent hover:text-white underline underline-offset-4 decoration-2">
                  ĐĂNG KÝ
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

