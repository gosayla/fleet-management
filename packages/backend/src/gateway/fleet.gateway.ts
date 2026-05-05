import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VehicleLocationUpdate } from '@fleet/shared';

/**
 * Fleet Gateway
 * Handles real-time GPS location updates from driver mobile apps
 * and broadcasts them to fleet manager clients.
 *
 * Events:
 *   Client → Server:
 *     'location:update'  — driver sends GPS ping
 *     'subscribe:fleet'  — manager subscribes to all vehicle locations
 *
 *   Server → Client:
 *     'vehicle:location' — broadcast to fleet room with new vehicle position
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/fleet',
})
export class FleetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FleetGateway.name);

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /** Driver app sends their GPS location */
  @SubscribeMessage('location:update')
  async handleLocationUpdate(
    @MessageBody() payload: VehicleLocationUpdate,
    @ConnectedSocket() client: Socket,
  ) {
    // Persist last known location to DB
    await this.prisma.vehicle.updateMany({
      where: { id: payload.vehicleId },
      data: {
        lastLocationLat: payload.location.lat,
        lastLocationLng: payload.location.lng,
        lastLocationAt: payload.timestamp ?? new Date(),
      },
    });

    // Broadcast to all fleet manager clients subscribed to this vehicle's company
    this.server
      .to(`fleet:${payload.vehicleId}`)
      .emit('vehicle:location', payload);

    // Also broadcast to company-wide room so map shows all vehicles
    this.server.emit('vehicle:location', payload);
  }

  /** Manager subscribes to real-time updates for a specific vehicle */
  @SubscribeMessage('subscribe:vehicle')
  handleSubscribeVehicle(
    @MessageBody() vehicleId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`fleet:${vehicleId}`);
    this.logger.log(`Client ${client.id} subscribed to vehicle ${vehicleId}`);
  }

  /** Manager unsubscribes from a vehicle */
  @SubscribeMessage('unsubscribe:vehicle')
  handleUnsubscribeVehicle(
    @MessageBody() vehicleId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`fleet:${vehicleId}`);
  }
}
