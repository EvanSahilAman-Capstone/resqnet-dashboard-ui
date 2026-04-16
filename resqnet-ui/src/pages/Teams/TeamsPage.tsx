import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useApi } from "../../utils/api";
import { useAuth0 } from '@auth0/auth0-react';
import TeamMembers from './TeamMembers';
import InviteModal from './InviteModal';

const TEAM_ID = "69abdfe640bb9ad155b6ea13";

interface Team {
  _id:        string;
  name:       string;
  org_id:     string | null;
  created_by: string;
  created_at: string;
}

const TeamsPage: React.FC = () => {
  const { fetchWithAuth }           = useApi();
  const { user }                    = useAuth0();
  const [team, setTeam]             = useState<Team | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [loading, setLoading]       = useState(true);

  const role    = (user as any)?.['https://resqnet.com/role'] ?? 'Users';
  const isAdmin = role === 'Admin'; 
  void isAdmin;

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchWithAuth(`/teams/${TEAM_ID}`);
        setTeam(data);
      } catch (err) {
        console.error('Failed to load team:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* ── Page Header (top left) ───────────────────────────── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center">
          <Users size={18} className="text-red-600" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900">Teams</h1>
          <p className="text-xs text-gray-400">Manage your teams</p>
        </div>
      </div>

      {/* ── Centered Card ────────────────────────────────────── */}
      <div className="flex justify-center">
        <div className="w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-sm p-6">

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : team ? (
            <>
              {/* Team name centered */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center mb-2">
                  <Users size={18} className="text-red-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">{team.name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Members</p>
              </div>

              <TeamMembers
                teamId={team._id}
                teamName={team.name}
                onInvite={() => setShowInvite(true)}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                <Users size={20} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">Team not found</p>
            </div>
          )}
        </div>
      </div>

      {showInvite && team && (
        <InviteModal
          teamId={team._id}
          onClose={() => setShowInvite(false)}
        />
      )}
    </div>
  );
};

export default TeamsPage;
