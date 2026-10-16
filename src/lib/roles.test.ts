import { describe, expect, it } from 'vitest';
import { buildAccess, resolveRole } from '@/lib/roles';

describe('resolveRole', () => {
  it('owner sin vínculo es admin', () => {
    expect(resolveRole({ id: 'a', role: 'admin', ownerId: null })).toEqual({
      role: 'admin',
      ownerId: null,
    });
  });

  it('cuenta vinculada siempre es staff aunque diga admin', () => {
    expect(resolveRole({ id: 'b', role: 'admin', ownerId: 'owner-1' })).toEqual({
      role: 'staff',
      ownerId: 'owner-1',
    });
  });

  it('rol desconocido con vínculo cae a staff', () => {
    expect(resolveRole({ id: 'k', role: 'rol-viejo', ownerId: 'owner-1' })).toEqual({
      role: 'staff',
      ownerId: 'owner-1',
    });
  });

  it('rol desconocido sin vínculo cae a admin', () => {
    expect(resolveRole({ id: 'x', role: 'rol-viejo', ownerId: null }).role).toBe('admin');
  });

  it('rol legacy/null cae a admin de la propia tienda', () => {
    expect(resolveRole({ id: 'c' }).role).toBe('admin');
    expect(resolveRole(null).role).toBe('admin');
  });
});

describe('buildAccess', () => {
  it('null sin usuario válido', () => {
    expect(buildAccess(null)).toBeNull();
    expect(buildAccess({})).toBeNull();
    expect(buildAccess({ id: '' })).toBeNull();
  });

  it('staff opera sobre la tienda del dueño', () => {
    const ctx = buildAccess({ id: 'staff-1', role: 'staff', ownerId: 'owner-9', name: 'María' });
    expect(ctx).toMatchObject({
      userId: 'staff-1',
      storeId: 'owner-9',
      role: 'staff',
      isAdmin: false,
      name: 'María',
    });
  });

  it('admin opera sobre su propia tienda', () => {
    const ctx = buildAccess({ id: 'owner-9', role: 'admin', ownerId: null });
    expect(ctx).toMatchObject({ userId: 'owner-9', storeId: 'owner-9', isAdmin: true });
  });

  it('vendedor opera sobre la tienda del dueño sin ser admin', () => {
    const ctx = buildAccess({ id: 'staff-2', role: 'staff', ownerId: 'owner-9', name: 'Pepe' });
    expect(ctx).toMatchObject({
      userId: 'staff-2',
      storeId: 'owner-9',
      role: 'staff',
      isAdmin: false,
      name: 'Pepe',
    });
  });
});
