import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await axios.post('http://localhost:4000/api/auth/register', {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      toast.success('Đăng ký tài khoản thành công!', {
        description: 'Tài khoản của bạn đã sẵn sàng. Hãy đăng nhập để bắt đầu.',
      });
      navigate('/login');
    } catch (error: any) {
      console.error('Register error', error);
      const errorMsg =
        error.response?.data?.message ||
        'Đăng ký thất bại. Email có thể đã tồn tại trong hệ thống.';
      toast.error('Đăng ký thất bại', {
        description: Array.isArray(errorMsg) ? errorMsg.join(', ') : errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white p-4 antialiased bg-noise">
      {/* Bauhaus Decorative Shapes */}
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-accent/90 mix-blend-multiply" />
      <div className="pointer-events-none absolute top-10 right-20 h-72 w-72 bg-destructive/90 mix-blend-multiply rotate-45" />
      <div className="pointer-events-none absolute bottom-1/3 left-1/4 h-32 w-32 border-[12px] border-primary/90 rounded-none" />
      <div className="pointer-events-none absolute -top-10 -right-10 w-0 h-0 border-l-[150px] border-l-transparent border-b-[200px] border-b-primary/80 border-r-[150px] border-r-transparent rotate-45" />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bauhaus-card !bg-slate-900 border-4 border-slate-900 overflow-hidden">
          {/* Subtle Accent Blocks */}
          <div className="absolute top-0 left-0 w-16 h-16 bg-primary" />
          <div className="absolute bottom-0 right-0 w-24 h-4 bg-accent" />
          
          <CardHeader className="space-y-2 text-center pt-10 pb-6 relative z-10">
            <div className="flex justify-center mb-2">
              <div className="flex h-14 w-14 items-center justify-center bg-accent text-slate-900 border-2 border-slate-900 shadow-[4px_4px_0px_0px_#fff]">
                <span className="text-3xl font-black">W</span>
              </div>
            </div>
            <CardTitle className="text-3xl font-black tracking-tight text-white uppercase">
              TẠO<span className="text-primary"> TÀI KHOẢN</span>
            </CardTitle>
            <CardDescription className="text-sm font-medium text-slate-300 uppercase tracking-widest">
              Gia nhập WorkSync
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit} className="relative z-10">
            <CardContent className="space-y-5 px-8 pt-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Họ và tên
                </Label>
                <Input 
                  id="name" 
                  placeholder="NGUYỄN VĂN A" 
                  required 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 rounded-none border-2 border-white bg-slate-800 px-4 text-sm text-white placeholder:text-slate-500 transition-all focus:border-accent focus:bg-slate-900 focus:ring-0"
                />
              </div>

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
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tối thiểu 6 ký tự"
                    required 
                    minLength={6}
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
                    ĐĂNG KÝ
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>

              <div className="text-center text-sm font-bold text-slate-400 mt-4 uppercase">
                ĐÃ CÓ TÀI KHOẢN?{' '}
                <a href="/login" className="text-accent hover:text-white underline underline-offset-4 decoration-2">
                  ĐĂNG NHẬP
                </a>
              </div>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}

