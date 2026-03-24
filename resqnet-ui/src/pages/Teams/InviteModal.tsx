import React, { useState } from 'react';
import { X, Send, UserPlus, CheckCircle, Shield, Crown, Link } from 'lucide-react';
import { useApi } from "../../utils/api";
// import { useAuth0 } from '@auth0/auth0-react';

interface Props {
  teamId:  string;
  onClose: () => void;
}

const InviteModal: React.FC<Props> = ({ teamId, onClose }) => {
  const { fetchWithAuth }     = useApi();
  // const { user }              = useAuth0();
  const [email, setEmail]     = useState('');
  const [role, setRole]       = useState<'Responder' | 'Admin'>('Responder');
  const [sent, setSent]       = useState(false);
  const [token, setToken]     = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);

  // const role_user = (user as any)?.['https://resqnet.com/role'] ?? 'Users';

  // Only Admins can send invites — Responders see a read-only invite link
  // const isAdmin = role_user === 'Admin';

  const submit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(`/teams/${teamId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      });
      setToken(res.token);
      setSent(true);
    } catch (err) {
      console.error('Invite failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const inviteLink = `${window.location.origin}/invites/${token}/accept`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <UserPlus size={15} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Invite Member</h2>
              <p className="text-xs text-gray-400">Send an invite to join this team</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {sent ? (
            <div className="flex flex-col items-center py-4 gap-3">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle size={22} className="text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-900">Invite sent!</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Sent to <span className="font-medium text-gray-700">{email}</span>
                </p>
              </div>

              {/* Copyable invite link */}
              <div className="w-full mt-1">
                <p className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                  <Link size={10} />
                  Share invite link
                </p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-600 outline-none truncate"
                  />
                  <button
                    onClick={copyLink}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                      copied
                        ? 'bg-green-50 text-green-600 border border-green-200'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                onClick={onClose}
                className="mt-1 w-full py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">

              {/* Email */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="responder@example.com"
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:bg-white text-gray-800 transition-colors"
                />
              </div>

              {/* Role selector */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                  Assign role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setRole('Responder')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      role === 'Responder'
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Shield size={13} />
                    Responder
                  </button>
                  <button
                    onClick={() => setRole('Admin')}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      role === 'Admin'
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <Crown size={13} />
                    Admin
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={submit}
                disabled={loading || !email.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-700 disabled:opacity-40 text-white text-sm font-medium transition-colors shadow-sm"
              >
                <Send size={13} />
                {loading ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
