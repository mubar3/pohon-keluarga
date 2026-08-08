'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ name: '', birthYear: '', parentId: '' });

  // Fetch data awal saat aplikasi dimuat
  useEffect(() => {
    fetchData();
    const savedUser = localStorage.getItem('ft_user');
    if (savedUser) setCurrentUser(savedUser);
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/family');
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error('Gagal mengambil data silsilah', err);
    }
  };

  // Auth Handler
  const handleAuth = async (e) => {
    e.preventDefault();
    if (!authForm.username || !authForm.password) return alert('Isi semua field!');

    const res = await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isRegister ? 'REGISTER' : 'LOGIN',
        ...authForm,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      if (isRegister) {
        alert('Register berhasil! Silakan Login.');
        setIsRegister(false);
      } else {
        setCurrentUser(data.username);
        localStorage.setItem('ft_user', data.username);
      }
      setAuthForm({ username: '', password: '' });
    } else {
      alert(data.error);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ft_user');
  };

  // Tambah Anggota
  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!memberForm.name) return alert('Nama wajib diisi!');

    const res = await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'ADD_MEMBER',
        ...memberForm,
      }),
    });

    if (res.ok) {
      setMemberForm({ name: '', birthYear: '', parentId: '' });
      fetchData();
    }
  };

  // Export File JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ members }, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `family_tree_backup.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  // Import File JSON
  const handleImportJSON = (e) => {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed.members) {
            await fetch('/api/family', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'IMPORT', data: parsed }),
            });
            fetchData();
            alert('Data JSON berhasil diimport!');
          }
        } catch (err) {
          alert('Format JSON tidak valid!');
        }
      };
    }
  };

  // Tampilan Login / Register
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
          <h1 className="text-2xl font-bold text-center mb-1">🌳 Family Tree App</h1>
          <p className="text-slate-400 text-sm text-center mb-6">
            {isRegister ? 'Buat akun baru' : 'Masuk ke akun Anda'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Username</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                value={authForm.username}
                onChange={(e) => setAuthForm({ ...authForm, username: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Password</label>
              <input
                type="password"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-blue-500"
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
              />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 font-semibold py-2.5 rounded-lg text-sm transition">
              {isRegister ? 'Register' : 'Login'}
            </button>
          </form>

          <p onClick={() => setIsRegister(!isRegister)} className="text-xs text-blue-400 text-center mt-4 cursor-pointer hover:underline">
            {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Register'}
          </p>
        </div>
      </div>
    );
  }

  // Root members (Generasi pertama / tanpa induk)
  const rootMembers = members.filter((m) => !m.parentId);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <header className="max-w-5xl mx-auto flex justify-between items-center pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold">🌳 Silsilah Keluarga</h1>
          <p className="text-xs text-slate-400">Login sebagai: <span className="text-blue-400">{currentUser}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportJSON} className="bg-emerald-600 hover:bg-emerald-500 text-xs px-3 py-2 rounded-lg font-medium">
            📥 Export JSON
          </button>
          <label className="bg-purple-600 hover:bg-purple-500 text-xs px-3 py-2 rounded-lg font-medium cursor-pointer">
            📤 Import JSON
            <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          </label>
          <button onClick={handleLogout} className="bg-rose-600 hover:bg-rose-500 text-xs px-3 py-2 rounded-lg font-medium">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Form Tambah Anggota */}
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 h-fit">
          <h2 className="text-base font-semibold mb-4">Tambah Anggota Keluarga</h2>
          <form onSubmit={handleAddMember} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nama Lengkap</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                value={memberForm.name}
                onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })}
                placeholder="Contoh: Budi Santoso"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tahun Lahir</label>
              <input
                type="number"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                value={memberForm.birthYear}
                onChange={(e) => setMemberForm({ ...memberForm, birthYear: e.target.value })}
                placeholder="1980"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Orang Tua / Induk</label>
              <select
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                value={memberForm.parentId}
                onChange={(e) => setMemberForm({ ...memberForm, parentId: e.target.value })}
              >
                <option value="">-- Akar Utama (Generasi 1) --</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.birthYear ? `(${m.birthYear})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-sm font-semibold py-2 rounded-lg mt-2">
              + Simpan Data
            </button>
          </form>
        </div>

        {/* Tree Render */}
        <div className="md:col-span-2 bg-slate-800 p-5 rounded-2xl border border-slate-700">
          <h2 className="text-base font-semibold mb-4">Bagan Silsilah</h2>
          {rootMembers.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">Belum ada data silsilah.</p>
          ) : (
            <div className="space-y-3">
              {rootMembers.map((root) => (
                <TreeNode key={root.id} node={root} allMembers={members} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Rekursif Tree Component
function TreeNode({ node, allMembers }) {
  const children = allMembers.filter((m) => m.parentId === node.id);

  return (
    <div className="border-l-2 border-blue-500/40 pl-4 py-1">
      <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl inline-block min-w-[180px]">
        <p className="font-semibold text-blue-400 text-sm">{node.name}</p>
        {node.birthYear && <p className="text-xs text-slate-400">Tahun Lahir: {node.birthYear}</p>}
      </div>

      {children.length > 0 && (
        <div className="ml-3 mt-2 space-y-2">
          {children.map((child) => (
            <TreeNode key={child.id} node={child} allMembers={allMembers} />
          ))}
        </div>
      )}
    </div>
  );
}