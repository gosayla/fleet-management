import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleLocationUpdate } from '@fleet/shared';

function getEnv(name: string): string | undefined {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

const SOCKET_URL = getEnv('SOCKET_URL') ?? 'http://10.0.2.2:3001';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (!socket) {
    const token = (await AsyncStorage.getItem('accessToken')) ?? '';
    socket = io(`${SOCKET_URL}/fleet`, {
      autoConnect: false,
      auth: { token },
    });
  }
  return socket;
}

export async function startBroadcastingLocation(
  vehicleId: string,
  driverId: string,
  onConnect?: () => void,
) {
  const s = await getSocket();
  if (!s.connected) {
    s.connect();
    s.once('connect', () => onConnect?.());
  }

  return (update: Omit<VehicleLocationUpdate, 'vehicleId' | 'driverId'>) => {
    s.emit('location:update', {
      vehicleId,
      driverId,
      ...update,
      timestamp: new Date(),
    } satisfies VehicleLocationUpdate);
  };
}

export async function stopBroadcasting() {
  socket?.disconnect();
  socket = null;
}
