import { io, Socket } from 'socket.io-client';
import { VehicleLocationUpdate } from '@fleet/shared';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${SOCKET_URL}/fleet`, {
      autoConnect: false,
      auth: { token: localStorage.getItem('accessToken') ?? '' },
    });
  }
  return socket;
}

export function subscribeToVehicleLocation(
  vehicleId: string,
  onUpdate: (update: VehicleLocationUpdate) => void,
) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('subscribe:vehicle', vehicleId);
  s.on('vehicle:location', (data: VehicleLocationUpdate) => {
    if (data.vehicleId === vehicleId) onUpdate(data);
  });
}

export function subscribeToAllLocations(
  onUpdate: (update: VehicleLocationUpdate) => void,
) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.on('vehicle:location', onUpdate);
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
