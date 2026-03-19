'use client';

import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  ShoppingBag, 
  Settings, 
  TrendingUp, 
  DollarSign, 
  Package 
} from 'lucide-react';

const AdminDashboard = () => {
  const stats = [
    { label: 'Total Revenue', value: '$12,450', icon: DollarSign, trend: '+12.5%' },
    { label: 'Total Orders', value: '1,240', icon: ShoppingBag, trend: '+8.2%' },
    { label: 'Active Users', value: '8,420', icon: Users, trend: '+15.3%' },
    { label: 'New Signups', value: '142', icon: TrendingUp, trend: '+5.1%' },
  ];

  return (
    <div className="space-y-10">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-10 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-primary/20 transition-all"
          >
             <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                <stat.icon className="w-16 h-16" />
             </div>
            <div className="flex items-center justify-between mb-8">
              <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-primary border border-primary/10 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                {stat.trend}
              </span>
            </div>
            <div className="text-4xl font-black mb-1 text-brand-text tracking-tighter">{stat.value}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/30">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div className="flex items-center gap-4">
               <div className="w-1.5 h-6 bg-primary rounded-full" />
               <h2 className="text-2xl font-black uppercase tracking-tighter text-brand-text">Platform Overview</h2>
             </div>
             <button className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-6 py-2 rounded-full border border-primary/10">Full Report</button>
          </div>
          <div className="p-10">
            <div className="h-80 w-full bg-white/5 rounded-3xl border border-dashed border-white/10 flex items-center justify-center">
               <span className="text-brand-text/20 font-black uppercase tracking-widest text-xs italic">Traffic Visualization Pending</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-[2.5rem] border border-white/5 p-10 shadow-2xl">
           <div className="flex items-center gap-4 mb-10">
             <div className="w-1.5 h-6 bg-accent rounded-full" />
             <h2 className="text-2xl font-black uppercase tracking-tighter text-brand-text">System Alerts</h2>
           </div>
           <div className="space-y-6">
             {[
               { icon: Users, text: 'New 25 users signed up in the last hour.', time: '12m ago', color: 'text-primary' },
               { icon: ShoppingBag, text: 'Premium plan activated for user #4592.', time: '45m ago', color: 'text-emerald-400' },
               { icon: Settings, text: 'Server maintenance scheduled for 02:00 UTC.', time: '2h ago', color: 'text-accent' },
             ].map((alert, i) => (
               <div key={i} className="flex gap-4 p-4 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer group">
                 <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 border border-white/10 group-hover:border-primary/20`}>
                   <alert.icon className={`w-5 h-5 ${alert.color}`} />
                 </div>
                 <div>
                   <div className="text-xs font-black text-brand-text/80 leading-relaxed">{alert.text}</div>
                   <div className="text-[9px] font-black uppercase tracking-widest text-brand-text/30 mt-1">{alert.time}</div>
                 </div>
               </div>
             ))}
           </div>
           <button className="w-full mt-10 py-5 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest text-brand-text/40 hover:bg-white/10 transition-all border border-white/10">
             View All Activity
           </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
