import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service.js';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService
  ) {}

  async register(data: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await this.usersService.createWithPersonalProject({
      email: data.email,
      name: data.name,
      passwordHash,
    });

    return this.generateToken(user);
  }

  async login(data: LoginDto) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateToken(user);
  }

  async validateOAuthLogin(email: string, name: string, avatar: string) {
    let user = await this.usersService.findByEmail(email);
    if (!user) {
      // User mới - tạo account + personal project
      user = await this.usersService.createWithPersonalProject({
        email,
        name,
        avatar,
        passwordHash: '', // OAuth không cần mật khẩu
      });
    } else {
      // User đã tồn tại - sync name/avatar từ Google (idempotent)
      if (user.name !== name || user.avatar !== avatar) {
        user = await this.usersService.updateProfile(user.id, {
          name,
          avatar,
        });
      }
    }
    return this.generateToken(user);
  }

  private generateToken(user: import('@prisma/client').User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    return {
      accessToken,
      token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }
}
