import type { ClientProfile } from '../types/client';

import goto from './clients/goto.json';
import maegawa from './clients/maegawa.json';
import honda from './clients/honda.json';
import furuta from './clients/furuta.json';
import nakamura from './clients/nakamura.json';
import uchida from './clients/uchida.json';

export const clients: ClientProfile[] = [
  goto,
  maegawa,
  honda,
  furuta,
  nakamura,
  uchida,
] as ClientProfile[];

export function getClientById(id: string): ClientProfile | undefined {
  return clients.find((c) => c.id === id);
}

export function getClientNames(): { id: string; name: string }[] {
  return clients.map((c) => ({ id: c.id, name: c.name }));
}
