import React, { useEffect, useState } from 'react';
import { UserMinus, ShieldCheck, Shield, User, UserPlus } from 'lucide-react';
import { useApi } from "../../utils/api";
import { useAuth0 } from '@auth0/auth0-react';

interface Member {
  _id:       string;
  auth0_id:  string;
  username:  string;
  email:     string;
  role:      'Admin' | 'Responder';
  joined_at: string;
}

const ROLE_ICON = {
  Admin:     <ShieldCheck size={14} className="text-red-400"  />,
  Responder: <Shield      size={14} className="text-blue-400" />,
};

interface Props {
  teamId:   string;
  teamName: string;
  onInvite: () => void;
}

const TeamMembers: React.FC<Props> = ({ teamId, onInvite }) => {
  const { fetchWithAuth }     = useApi();
  const { user }              = useAuth0();
  const [members, setMembers] = useState<Member[]>([]);

  const role    = (user as any)?.['https://resqnet.com/role'] ?? 'Responder';
  const isAdmin = role === 'Admin';

  useEffect(() => {
    fetchWithAuth(`/teams/${teamId}/members`).then(setMembers);
  }, [teamId]);

  const kick = async (auth0_id: string) => {
    await fetchWithAuth(`/teams/${teamId}/members/${auth0_id}`, { method: 'DELETE' });
    setMembers((p) => p.filter((m) => m.auth0_id !== auth0_id));
  };

  const changeRole = async (auth0_id: string, newRole: string) => {
    await fetchWithAuth(
      `/teams/${teamId}/members/${auth0_id}/role?new_role=${newRole}`,
      { method: 'PATCH' }
    );
    setMembers((p) =>
      p.map((m) => m.auth0_id === auth0_id ? { ...m, role: newRole as Member['role'] } : m)
    );
  };

  return (
    <div className="rounded-xl p-2">

      {/* Invite button */}
      {isAdmin && (
        <div className="flex justify-end mb-3">
          <button
            onClick={onInvite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors border border-gray-200"
          >
            <UserPlus size={12} />
            Invite
          </button>
        </div>
      )}

      {/* Member List */}
      <div className="space-y-2">
        {members.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No members yet</p>
        ) : (
          members.map((m) => (
            <div
              key={m._id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 group"
            >
              {/* Avatar */}
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                <User size={12} className="text-gray-500" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 truncate">{m.username || m.email}</p>
                <p className="text-[10px] text-gray-400 truncate">{m.email}</p>
              </div>

              {/* Role */}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {ROLE_ICON[m.role]}
                <span>{m.role}</span>
              </div>

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => changeRole(m.auth0_id, m.role === 'Admin' ? 'Responder' : 'Admin')}
                    className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-purple-500 transition-colors"
                    title={`Change to ${m.role === 'Admin' ? 'Responder' : 'Admin'}`}
                  >
                    <ShieldCheck size={12} />
                  </button>
                  <button
                    onClick={() => kick(m.auth0_id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove from team"
                  >
                    <UserMinus size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeamMembers;
