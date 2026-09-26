import { useEffect, useRef, useState, useCallback } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../socket/socketClient';
import type { RoomSummary, Participant, ChatMessage, Role, ReactionEmoji, LocalUser } from '../types';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface PlaybackEvent {
  seq: number;
  type: 'sync' | 'play' | 'pause' | 'seek' | 'video_changed';
  videoId: string | null;
  time: number;
  isPlaying: boolean;
}

export interface FloatingReaction {
  id: string;
  emoji: ReactionEmoji;
  username: string;
}

export interface JoinRequest {
  userId: string;
  username: string;
  createdAt?: string;
}

let seqCounter = 0;

export function useRoomSocket(roomId: string | undefined, user: LocalUser | null, token: string | null) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [playbackEvent, setPlaybackEvent] = useState<PlaybackEvent | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [removedNotice, setRemovedNotice] = useState(false);
  const [closedNotice, setClosedNotice] = useState<string | null>(null);
  const [joinPending, setJoinPending] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);

  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;

  useEffect(() => {
    if (!roomId || !user) return;

    const socket = connectSocket();
    setConnectionStatus(socket.connected ? 'connected' : 'connecting');

    function doJoin() {
      socket.emit(
        'join_room',
        { roomId, username: user!.username, token },
        (ack: { ok: boolean; pending?: boolean; message?: string; code?: string }) => {
          if (ack?.pending) {
            setJoinPending(true);
            return;
          }
          if (!ack?.ok) {
            setJoinError(ack?.message || 'Could not join this room.');
          }
        }
      );
    }

    function onConnect() {
      setConnectionStatus('connected');
      setJoinError(null);
      doJoin();
    }
    function onDisconnect() {
      setConnectionStatus('disconnected');
    }
    function onReconnectAttempt() {
      setConnectionStatus('reconnecting');
    }

    function onSyncState(payload: {
      room: RoomSummary;
      participants: Participant[];
      you: { userId: string; role: Role };
    }) {
      setRoom(payload.room);
      setJoinPending(false);
      setJoinError(null);
      setParticipants(payload.participants);
      setMyRole(payload.you.role);
      seqCounter += 1;
      setPlaybackEvent({
        seq: seqCounter,
        type: 'sync',
        videoId: payload.room.videoId,
        time: payload.room.currentTime,
        isPlaying: payload.room.isPlaying,
      });
    }

    function onRoomStateUpdated(payload: { participants: Participant[] }) {
      setParticipants(payload.participants);
      setRoom((previous) => previous
        ? { ...previous, viewerCount: payload.participants.filter((participant) => participant.online).length }
        : previous);
      setMyRole((prev) => {
        const mine = payload.participants.find((p) => p.userId === user!.userId);
        return mine ? mine.role : prev;
      });
    }

    function onJoinRequestPending() {
      setJoinPending(true);
    }

    function onJoinRequestApproved() {
      setJoinPending(false);
      setJoinError(null);
    }

    function onJoinRequestRejected(payload: { message?: string }) {
      setJoinPending(false);
      setJoinError(payload.message || 'Your request to join was rejected.');
    }

    function onJoinRequestsUpdated(payload: { requests: JoinRequest[] }) {
      setJoinRequests(payload.requests);
    }

    function onJoinRequestReceived(request: JoinRequest) {
      setJoinRequests((previous) => previous.some((item) => item.userId === request.userId)
        ? previous
        : [...previous, request]);
    }

    function onUserJoined(p: Participant) {
      setMessages((prev) => [
        ...prev,
        {
          messageId: `sys_${Date.now()}_${p.userId}`,
          userId: 'system',
          username: 'system',
          text: `${p.username} joined the party`,
          timestamp: new Date().toISOString(),
          system: true,
        },
      ]);
    }

    function onUserLeft({ userId, username, roomId: leftRoomId, participantCount }: {
      userId: string;
      username?: string;
      roomId?: string;
      participantCount?: number;
    }) {
      if (!leftRoomId || leftRoomId.toUpperCase() === roomId?.toUpperCase()) {
        setParticipants((previous) => previous.map((participant) => (
          participant.userId === userId ? { ...participant, online: false } : participant
        )));
        if (participantCount !== undefined) {
          setRoom((previous) => previous ? { ...previous, viewerCount: participantCount } : previous);
        }
      }
      setMessages((msgs) => [
        ...msgs,
        {
          messageId: `sys_${Date.now()}_${userId}`,
          userId: 'system',
          username: 'system',
          text: `${username || 'A participant'} left the party`,
          timestamp: new Date().toISOString(),
          system: true,
        },
      ]);
    }

    function onPlay({ time }: { time: number }) {
      seqCounter += 1;
      setPlaybackEvent((prev) => ({
        seq: seqCounter,
        type: 'play',
        videoId: prev?.videoId ?? null,
        time,
        isPlaying: true,
      }));
      setRoom((prev) => (prev ? { ...prev, isPlaying: true, currentTime: time } : prev));
    }

    function onPause({ time }: { time: number }) {
      seqCounter += 1;
      setPlaybackEvent((prev) => ({
        seq: seqCounter,
        type: 'pause',
        videoId: prev?.videoId ?? null,
        time,
        isPlaying: false,
      }));
      setRoom((prev) => (prev ? { ...prev, isPlaying: false, currentTime: time } : prev));
    }

    function onSeek({ time }: { time: number }) {
      seqCounter += 1;
      setPlaybackEvent((prev) => ({
        seq: seqCounter,
        type: 'seek',
        videoId: prev?.videoId ?? null,
        time,
        isPlaying: prev?.isPlaying ?? false,
      }));
      setRoom((prev) => (prev ? { ...prev, currentTime: time } : prev));
    }

    function onVideoChanged({
      videoId,
      time = 0,
      isPlaying = false,
    }: {
      videoId: string;
      time?: number;
      isPlaying?: boolean;
    }) {
      seqCounter += 1;
      setPlaybackEvent({ seq: seqCounter, type: 'video_changed', videoId, time, isPlaying });
      setRoom((prev) => (prev ? { ...prev, videoId, currentTime: time, isPlaying } : prev));
    }

    function onNewMessage(message: ChatMessage) {
      setMessages((prev) => [...prev, message]);
    }

    function onNewReaction(payload: { emoji: ReactionEmoji; username: string }) {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setReactions((prev) => [...prev, { id, emoji: payload.emoji, username: payload.username }]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== id));
      }, 2200);
    }

    function onRoleAssigned() {
      // room_state_updated (sent alongside) carries the authoritative participant list.
    }

    function onParticipantRemoved(payload: { userId: string; you?: boolean }) {
      if (payload.you) {
        setRemovedNotice(true);
      }
    }

    function onHostTransferred() {
      // room_state_updated carries the authoritative participant list + roles.
    }

    function onPermissionError(payload: { message: string }) {
      setPermissionError(payload.message);
      setTimeout(() => setPermissionError(null), 4000);
    }

    function onRoomClosed(payload: { reason?: string }) {
      setClosedNotice(payload.reason || 'This room is closed.');
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnectAttempt);
    socket.on('sync_state', onSyncState);
    socket.on('room_state_updated', onRoomStateUpdated);
    socket.on('join_request_pending', onJoinRequestPending);
    socket.on('join_request_approved', onJoinRequestApproved);
    socket.on('join_request_rejected', onJoinRequestRejected);
    socket.on('join_requests_updated', onJoinRequestsUpdated);
    socket.on('join_request_received', onJoinRequestReceived);
    socket.on('user_joined', onUserJoined);
    socket.on('user_left', onUserLeft);
    socket.on('play', onPlay);
    socket.on('pause', onPause);
    socket.on('seek', onSeek);
    socket.on('video_changed', onVideoChanged);
    socket.on('new_message', onNewMessage);
    socket.on('new_reaction', onNewReaction);
    socket.on('role_assigned', onRoleAssigned);
    socket.on('participant_removed', onParticipantRemoved);
    socket.on('host_transferred', onHostTransferred);
    socket.on('permission_error', onPermissionError);
    socket.on('room_closed', onRoomClosed);

    if (socket.connected) {
      doJoin();
    }

    return () => {
      socket.emit('leave_room');
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnectAttempt);
      socket.off('sync_state', onSyncState);
      socket.off('room_state_updated', onRoomStateUpdated);
      socket.off('join_request_pending', onJoinRequestPending);
      socket.off('join_request_approved', onJoinRequestApproved);
      socket.off('join_request_rejected', onJoinRequestRejected);
      socket.off('join_requests_updated', onJoinRequestsUpdated);
      socket.off('join_request_received', onJoinRequestReceived);
      socket.off('user_joined', onUserJoined);
      socket.off('user_left', onUserLeft);
      socket.off('play', onPlay);
      socket.off('pause', onPause);
      socket.off('seek', onSeek);
      socket.off('video_changed', onVideoChanged);
      socket.off('new_message', onNewMessage);
      socket.off('new_reaction', onNewReaction);
      socket.off('role_assigned', onRoleAssigned);
      socket.off('participant_removed', onParticipantRemoved);
      socket.off('host_transferred', onHostTransferred);
      socket.off('permission_error', onPermissionError);
      socket.off('room_closed', onRoomClosed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user?.userId, token]);

  // Disconnect the shared socket entirely when navigating away from the app's room context.
  useEffect(() => {
    return () => {
      if (!roomIdRef.current) disconnectSocket();
    };
  }, []);

  const play = useCallback((time: number) => getSocket().emit('play', { time }), []);
  const pause = useCallback((time: number) => getSocket().emit('pause', { time }), []);
  const seek = useCallback((time: number) => getSocket().emit('seek', { time }), []);
  const changeVideo = useCallback((url: string) => getSocket().emit('change_video', { url }), []);
  const sendMessage = useCallback((text: string) => getSocket().emit('send_message', { text }), []);
  const sendReaction = useCallback((emoji: ReactionEmoji) => getSocket().emit('send_reaction', { emoji }), []);
  const assignRole = useCallback(
    (targetUserId: string, role: Role) => getSocket().emit('assign_role', { targetUserId, role }),
    []
  );
  const removeParticipant = useCallback(
    (targetUserId: string) => getSocket().emit('remove_participant', { targetUserId }),
    []
  );
  const transferHost = useCallback(
    (targetUserId: string) => getSocket().emit('transfer_host', { targetUserId }),
    []
  );
  const closeRoom = useCallback(() => getSocket().emit('close_room'), []);
  const approveJoinRequest = useCallback((userId: string) => getSocket().emit('approve_join_request', { userId }), []);
  const rejectJoinRequest = useCallback((userId: string) => getSocket().emit('reject_join_request', { userId }), []);

  return {
    connectionStatus,
    room,
    participants,
    messages,
    reactions,
    playbackEvent,
    joinError,
    permissionError,
    myRole,
    removedNotice,
    closedNotice,
    joinPending,
    joinRequests,
    actions: {
      play,
      pause,
      seek,
      changeVideo,
      sendMessage,
      sendReaction,
      assignRole,
      removeParticipant,
      transferHost,
      closeRoom,
      approveJoinRequest,
      rejectJoinRequest,
    },
  };
}
