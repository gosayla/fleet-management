import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VehicleLocationUpdate } from '@fleet/shared';
import {SOCKET_URL} from './env';

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

export async function subscribeToVehicleLocation(
  vehicleId: string,
  onUpdate: (update: VehicleLocationUpdate) => void,
) {
  const s = await getSocket();
  if (!s.connected) s.connect();

  const handler = (data: VehicleLocationUpdate) => {
    if (data.vehicleId === vehicleId) onUpdate(data);
  };

  s.emit('subscribe:vehicle', vehicleId);
  s.on('vehicle:location', handler);

  return () => {
    s.off('vehicle:location', handler);
    s.emit('unsubscribe:vehicle', vehicleId);
  };
}

export async function stopBroadcasting() {
  socket?.disconnect();
  socket = null;
}
