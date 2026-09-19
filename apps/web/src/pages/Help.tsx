import React, { useState } from 'react';
import { cn } from '../utils/cn';
import {
  Search,
  BookOpen,
  LifeBuoy,
  Keyboard,
  Send,
  Mail,
  Github,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const faqs = [
  {
    question: 'How do I add a new worker?',
    answer: 'Navigate to the Workers page and click "Add Worker". Fill in the required fields including employee ID, name, email, department, role, shift type, and hire date. You can also add skills and certifications.',
  },
  {
    question: 'How do I record production output?',
    answer: 'Go to the Production page and click "Add Record". Select the machine, worker, and shift, then enter the product name, quantity produced, target quantity, quality pass/fail counts, and time range.',
  },
  {
    question: 'How do I assign workers to shifts?',
    answer: 'Visit the Shifts page and switch to the "Assignments" tab. Click "Assign Worker" to create a new assignment, or use the calendar view to see all assignments for a date range.',
  },
  {
    question: 'How do I generate a report?',
    answer: 'On the Reports page, click "Generate Report". Choose a report type (Production, Worker, Machine, Shift, or Quality), give it a name, and set any filters. The report will be generated and available for download.',
  },
  {
    question: 'How do I enable push notifications?',
    answer: 'Go to Settings > Preferences and enable "Push Notifications". You\'ll be prompted to allow notifications in your browser. Once enabled, you\'ll receive real-time alerts for important events.',
  },
  {
    question: 'How do I change my password?',
    answer: 'Go to Settings > Profile and click "Change Password". Enter your current password and the new password (minimum 8 characters).',
  },
  {
    question: 'What do the machine status colors mean?',
    answer: 'Green = Operational, Yellow = Maintenance, Gray = Offline, Red = Error. Machines needing maintenance will show a warning on the dashboard.',
  },
  {
    question: 'How do I export data to Excel?',
    answer: 'Most list pages have an export option. For production data, you can also use the Reports page to generate an Excel report with custom filters.',
  },
];

const shortcuts = [
  { key: 'G then D', description: 'Go to Dashboard' },
  { key: 'G then W', description: 'Go to Workers' },
  { key: 'G then M', description: 'Go to Machines' },
  { key: 'G then P', description: 'Go to Production' },
  { key: 'G then S', description: 'Go to Shifts' },
  { key: 'G then R', description: 'Go to Reports' },
  { key: 'G then N', description: 'Go to Notifications' },
  { key: '/', description: 'Focus search' },
  { key: 'Esc', description: 'Close modal / Go back' },
];

export default function Help() {
  const [search, setSearch] = useState('');
  const [openFAQs, setOpenFAQs] = useState<Set<number>>(new Set([0, 1, 2]));

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(search.toLowerCase()) ||
    faq.answer.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFAQ = (index: number) => {
    setOpenFAQs(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Help Center</h1>
        <p className="text-slate-400">Find answers to common questions</p>
      </div>

      {/* Search */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search help articles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="mailto:support@metex.com" className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-brand-500 transition-colors flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10"><Mail className="h-6 w-6 text-blue-400" /></div>
          <div>
            <h3 className="font-semibold text-white">Email Support</h3>
            <p className="text-sm text-slate-400">support@metex.com</p>
          </div>
        </a>
        <a href="https://github.com/makbarshah1974/workforce-dashboard-react" target="_blank" rel="noopener noreferrer" className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-brand-500 transition-colors flex items-start gap-4">
          <div className="p-3 rounded-lg bg-purple-500/10"><Github className="h-6 w-6 text-purple-400" /></div>
          <div>
            <h3 className="font-semibold text-white">Documentation</h3>
            <p className="text-sm text-slate-400">GitHub Repository</p>
          </div>
        </a>
        <a href="#" className="bg-slate-800 rounded-xl border border-slate-700 p-6 hover:border-brand-500 transition-colors flex items-start gap-4">
          <div className="p-3 rounded-lg bg-green-500/10"><LifeBuoy className="h-6 w-6 text-green-400" /></div>
          <div>
            <h3 className="font-semibold text-white">Submit Ticket</h3>
            <p className="text-sm text-slate-400">Create a support request</p>
          </div>
        </a>
      </div>

      {/* FAQs */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Frequently Asked Questions
          </h2>
        </div>
        <div className="divide-y divide-slate-700">
          {filteredFAQs.map((faq, index) => {
            const originalIndex = faqs.indexOf(faq);
            const isOpen = openFAQs.has(originalIndex);
            return (
              <div key={originalIndex}>
                <button
                  onClick={() => toggleFAQ(originalIndex)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 hover:bg-slate-700/50 transition-colors"
                >
                  <span className="font-medium text-white">{faq.question}</span>
                  {isOpen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-slate-300 animate-slide-down">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Keyboard className="h-5 w-5" />
          Keyboard Shortcuts
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
              <kbd className="px-2 py-1 bg-slate-900 rounded text-sm font-mono text-slate-300 border border-slate-600">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-slate-400 ml-4">{shortcut.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Version Info */}
      <div className="text-center text-sm text-slate-500">
        <p>Workforce Dashboard v1.0.0</p>
        <p>Built with React 18, TypeScript, Tailwind CSS, and Cloudflare Workers</p>
      </div>
    </div>
  );
}