import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import type { UsersService } from '../users/users.service.js';
import type { JwtService } from '@nestjs/jwt';

describe('AuthService.register', () => {
  it('provisions a personal project while registering a password account', async () => {
    const createWithPersonalProject = vi.fn().mockResolvedValue({
      id: 'user-1',
      email: 'member@worksync.test',
      name: 'Member One',
      role: 'EMPLOYEE',
      avatar: null,
    });
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue(null),
      createWithPersonalProject,
    } as unknown as UsersService;
    const jwtService = { sign: vi.fn().mockReturnValue('access-token') } as unknown as JwtService;
    const service = new AuthService(usersService, jwtService);

    const result = await service.register({
      email: 'member@worksync.test',
      name: 'Member One',
      password: 'password-123',
    });

    expect(createWithPersonalProject).toHaveBeenCalledWith(expect.objectContaining({
      email: 'member@worksync.test',
      name: 'Member One',
    }));
    expect(result.accessToken).toBe('access-token');
  });
});
