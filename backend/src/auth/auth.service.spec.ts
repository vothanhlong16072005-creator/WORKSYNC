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

describe('AuthService.validateOAuthLogin', () => {
  it('creates a new user when not yet existing', async () => {
    const created = { id: 'u-1', email: 'g@x.com', name: 'New', avatar: 'a', role: 'EMPLOYEE' };
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue(null),
      createWithPersonalProject: vi.fn().mockResolvedValue(created),
    } as unknown as UsersService;
    const jwtService = { sign: vi.fn().mockReturnValue('token') } as unknown as JwtService;
    const service = new AuthService(usersService, jwtService);

    const result = await service.validateOAuthLogin('g@x.com', 'New', 'a');
    expect(usersService.createWithPersonalProject).toHaveBeenCalled();
    expect(result.accessToken).toBe('token');
  });

  it('syncs name/avatar when user already exists and data differs', async () => {
    const existing = { id: 'u-1', email: 'g@x.com', name: 'Old', avatar: 'old-avatar', role: 'EMPLOYEE' };
    const updated = { ...existing, name: 'New', avatar: 'new-avatar' };
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue(existing),
      createWithPersonalProject: vi.fn(),
      updateProfile: vi.fn().mockResolvedValue(updated),
    } as unknown as UsersService;
    const jwtService = { sign: vi.fn().mockReturnValue('token') } as unknown as JwtService;
    const service = new AuthService(usersService, jwtService);

    const result = await service.validateOAuthLogin('g@x.com', 'New', 'new-avatar');
    expect(usersService.updateProfile).toHaveBeenCalledWith('u-1', { name: 'New', avatar: 'new-avatar' });
    expect(result.accessToken).toBe('token');
  });

  it('does NOT update DB when name/avatar unchanged (idempotent)', async () => {
    const existing = { id: 'u-1', email: 'g@x.com', name: 'Same', avatar: 'same-avatar', role: 'EMPLOYEE' };
    const usersService = {
      findByEmail: vi.fn().mockResolvedValue(existing),
      createWithPersonalProject: vi.fn(),
      updateProfile: vi.fn(),
    } as unknown as UsersService;
    const jwtService = { sign: vi.fn().mockReturnValue('token') } as unknown as JwtService;
    const service = new AuthService(usersService, jwtService);

    const result = await service.validateOAuthLogin('g@x.com', 'Same', 'same-avatar');
    expect(usersService.updateProfile).not.toHaveBeenCalled();
    expect(result.accessToken).toBe('token');
  });
});
