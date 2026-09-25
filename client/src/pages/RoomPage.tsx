import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/common/Button';
import IdentityGate from '../components/common/IdentityGate';
import { LoadingState, ErrorState } from '../components/common/States';
import VideoPlayer from '../components/room/VideoPlayer';
import RoomHeader from '../components/room/RoomHeader';
import ParticipantList from '../components/room/ParticipantList';
import ChatPanel from '../components/room/ChatPanel';
import { ReactionBar, ReactionAnimation } from '../components/room/ReactionBar';
import InviteModal from '../components/room/InviteModal';
import ChangeVideoModal from '../components/room/ChangeVideoModal';
import ConnectionStatusBanner from '../components/room/ConnectionStatusBanner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import JoinRequests from '../components/room/JoinRequests';
import { useIdentityGate } from '../hooks/useIdentityGate';
import { useRoomSocket } from '../hooks/useRoomSocket';

type MobileTab = 'people' | 'chat';

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, token, confirmIdentity } = useIdentityGate();

  const [showInvite, setShowInvite] = useState(false);
  const [showChangeVideo, setShowChangeVideo] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>('people');

  const {
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
    actions,
  } = useRoomSocket(roomId, user, token);

  // Gate the whole room behind having an identity — prompts immediately on load if missing.
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <IdentityGate title="Pick a name to join" onConfirm={confirmIdentity} onCancel={() => navigate('/')} />
      </div>
    );
  }

  if (removedNotice) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <ErrorState
          title="Removed from room"
          message="The Host removed you from this watch party."
          onRetry={() => navigate('/')}
        />
      </div>
    );
  }

  if (closedNotice) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <ErrorState title="Room closed" message={closedNotice} onRetry={() => navigate('/home')} />
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <ErrorState title="Can't join this room" message={joinError} onRetry={() => navigate('/')} />
      </div>
    );
  }

  if (joinPending && !room) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <LoadingState label="Waiting for Host approval…" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState label="Joining the party…" />
      </div>
    );
  }

  const canControl = myRole === 'HOST' || myRole === 'MODERATOR';
  const isHost = myRole === 'HOST';
  const onlineCount = participants.filter((p) => p.online).length;
  const hostParticipant = participants.find((p) => p.role === 'HOST');
  const activeHost = participants.some((p) => p.role === 'HOST' && p.online);
  const canManageJoinRequests = isHost || (myRole === 'MODERATOR' && !activeHost);

  return (
    <div className="h-screen flex flex-col bg-[var(--wm-bg)]">
      <ConnectionStatusBanner status={connectionStatus} />
      <RoomHeader
        room={room}
        onlineCount={onlineCount}
        connectionStatus={connectionStatus}
        onInvite={() => setShowInvite(true)}
        onLeave={() => setConfirmLeave(true)}
        onClose={myRole === 'HOST' ? () => setConfirmClose(true) : undefined}
      />

      {canManageJoinRequests && (
        <JoinRequests
          requests={joinRequests}
          onApprove={actions.approveJoinRequest}
          onReject={actions.rejectJoinRequest}
        />
      )}

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 overflow-hidden">
        {/* Main column: player + now-watching + reactions */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-y-auto wm-scrollbar">
          <div className="relative">
            <VideoPlayer
              playbackEvent={playbackEvent}
              canControl={canControl}
              onPlay={actions.play}
              onPause={actions.pause}
              onSeek={actions.seek}
            />
            <ReactionAnimation reactions={reactions} />
          </div>

          <div className="wm-card p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--wm-bg-elevated)] border border-[var(--wm-border)] text-[var(--wm-text-muted)] shrink-0">
                {room.category}
              </span>
              <span className="text-[var(--wm-text-faint)] truncate">
                Hosted by {hostParticipant?.username ?? '—'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ReactionBar onReact={actions.sendReaction} />
              {canControl && (
                <Button size="sm" variant="secondary" onClick={() => setShowChangeVideo(true)}>
                  Change video
                </Button>
              )}
            </div>
          </div>

          {permissionError && (
            <div
              role="alert"
              className="text-sm text-[var(--wm-danger)] bg-[rgba(255,59,92,0.1)] border border-[rgba(255,59,92,0.3)] rounded-lg px-3 py-2"
            >
              {permissionError}
            </div>
          )}
        </div>

        {/* Side column: participants + chat (desktop: stacked; mobile: tabbed) */}
        <div className="lg:w-80 shrink-0 flex flex-col wm-card min-h-0 lg:h-full">
          <div className="lg:hidden flex border-b border-[var(--wm-border-soft)]">
            <TabButton active={mobileTab === 'people'} onClick={() => setMobileTab('people')}>
              People ({onlineCount})
            </TabButton>
            <TabButton active={mobileTab === 'chat'} onClick={() => setMobileTab('chat')}>
              Chat
            </TabButton>
          </div>

          <div
            className={`p-3 flex-1 min-h-0 ${mobileTab === 'people' ? 'flex' : 'hidden'} lg:flex lg:flex-col lg:h-1/2 lg:border-b lg:border-[var(--wm-border-soft)]`}
          >
            <ParticipantList
              participants={participants}
              myUserId={user.userId}
              isHost={isHost}
              onAssignRole={actions.assignRole}
              onRemove={actions.removeParticipant}
              onTransferHost={actions.transferHost}
            />
          </div>

          <div className={`p-3 flex-1 min-h-0 ${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex lg:flex-col lg:h-1/2`}>
            <ChatPanel messages={messages} myUserId={user.userId} onSend={actions.sendMessage} />
          </div>
        </div>
      </div>

      {showInvite && <InviteModal roomId={room.roomId} onClose={() => setShowInvite(false)} />}
      {showChangeVideo && (
        <ChangeVideoModal onSubmit={actions.changeVideo} onClose={() => setShowChangeVideo(false)} />
      )}
      {confirmLeave && (
        <ConfirmDialog
          title="Leave watch party?"
          message="You can rejoin anytime with the room link."
          confirmLabel="Leave"
          danger
          onConfirm={() => navigate('/')}
          onCancel={() => setConfirmLeave(false)}
        />
      )}
      {confirmClose && (
        <ConfirmDialog
          title="Close watch party?"
          message="The room will disappear from live rooms and new users will no longer be able to join."
          confirmLabel="Close room"
          danger
          onConfirm={() => {
            actions.closeRoom();
            setConfirmClose(false);
          }}
          onCancel={() => setConfirmClose(false)}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-sm font-medium py-2.5 border-b-2 transition-colors ${
        active ? 'text-[var(--wm-text)] border-[var(--wm-accent)]' : 'text-[var(--wm-text-faint)] border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
