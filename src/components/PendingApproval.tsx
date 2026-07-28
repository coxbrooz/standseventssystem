import React from 'react';
import { Clock, ShieldAlert, LogOut, Phone, MessageSquare } from 'lucide-react';
import { User } from '../types';

interface PendingApprovalProps {
  user: User;
  onLogout: () => void;
}

export default function PendingApproval({ user, onLogout }: PendingApprovalProps) {
  const isDeclined = user.approvalStatus === 'declined';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="flex justify-center mb-6">
          {isDeclined ? (
            <div className="bg-red-50 p-4 rounded-full text-red-600 border border-red-100">
              <ShieldAlert className="w-12 h-12" />
            </div>
          ) : (
            <div className="bg-amber-50 p-4 rounded-full text-amber-600 border border-amber-100 animate-pulse">
              <Clock className="w-12 h-12" />
            </div>
          )}
        </div>

        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
          {isDeclined ? 'Account Declined' : 'Approval Pending'}
        </h2>
        
        <p className="text-slate-600 text-sm mb-6">
          {isDeclined
            ? `Your request to join as a ${user.role} has been declined by the Church Administration. Please contact the Sunday School staff for details.`
            : `Hello ${user.fullName}, thank you for registering with PCEA St Andrew's Sunday School. Your account is currently pending administrator verification for child safety reasons.`}
        </p>

        <div className="bg-slate-50 p-4 rounded-xl text-left text-xs text-slate-600 space-y-2 mb-6">
          <p className="font-semibold text-slate-700">Account details:</p>
          <div><span className="font-medium text-slate-800">Email:</span> {user.email}</div>
          <div><span className="font-medium text-slate-800">Requested Role:</span> <span className="capitalize">{user.role}</span></div>
          <div><span className="font-medium text-slate-800">Phone number:</span> {user.phone}</div>
          <div>
            <span className="font-medium text-slate-800">Status:</span>{' '}
            <span className={`capitalize font-bold ${isDeclined ? 'text-red-600' : 'text-amber-600'}`}>
              {user.approvalStatus}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            <LogOut className="w-4 h-4" /> Log out of account
          </button>
          
          <div className="text-center mt-4">
            <p className="text-xs text-slate-500 flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5" /> PCEA St Andrew's Helpdesk: +254 712 345678
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
