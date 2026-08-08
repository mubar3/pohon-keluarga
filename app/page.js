'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  const [members, setMembers] = useState([]);
  const [memberForm, setMemberForm] = useState({ name: '', birthYear: '', parentId: '', spouseId: '' });
  const [editingMember, setEditingMember] = useState(null);
  const [deletingMember, setDeletingMember] = useState(null);

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
      setMemberForm({ name: '', birthYear: '', parentId: '', spouseId: '' });
      fetchData();
    }
  };

  // Cek Keturunan untuk mencegah siklus silsilah
  const isDescendant = (parentId, childId) => {
    if (!parentId) return false;
    if (parentId === childId) return true;
    const parent = members.find((m) => m.id === parentId);
    if (!parent) return false;
    return isDescendant(parent.parentId, childId);
  };

  // Edit Anggota
  const handleEditMember = async (e) => {
    e.preventDefault();
    if (!editingMember.name) return alert('Nama wajib diisi!');

    if (editingMember.parentId) {
      if (editingMember.parentId === editingMember.id) {
        return alert('Tidak dapat menjadikan diri sendiri sebagai orang tua');
      }
      if (isDescendant(editingMember.parentId, editingMember.id)) {
        return alert('Tidak dapat menjadikan keturunan sendiri sebagai orang tua');
      }
    }

    const res = await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'EDIT_MEMBER',
        id: editingMember.id,
        name: editingMember.name,
        birthYear: editingMember.birthYear,
        parentId: editingMember.parentId || null,
      }),
    });

    if (res.ok) {
      setEditingMember(null);
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Gagal memperbarui anggota');
    }
  };

  // Hapus Anggota
  const handleDeleteMember = async () => {
    if (!deletingMember) return;

    const res = await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE_MEMBER',
        id: deletingMember.id,
      }),
    });

    if (res.ok) {
      setDeletingMember(null);
      fetchData();
    } else {
      const data = await res.json();
      alert(data.error || 'Gagal menghapus anggota');
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
  // Menyaring agar tidak merender pasangan dari root yang sudah dirender (menghindari duplikasi)
  const rootMembers = members.filter((m) => {
    if (m.parentId) return false;
    if (m.spouseId) {
      const spouse = members.find((s) => s.id === m.spouseId);
      if (spouse && !spouse.parentId) {
        return m.id < spouse.id; // Render only one of the couple as root
      }
    }
    return true;
  });

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
            <div>
              <label className="block text-xs text-slate-400 mb-1">Pasangan (Opsional)</label>
              <select
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                value={memberForm.spouseId}
                onChange={(e) => setMemberForm({ ...memberForm, spouseId: e.target.value })}
              >
                <option value="">-- Tanpa Pasangan --</option>
                {members
                  .filter((m) => !m.spouseId)
                  .map((m) => (
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
                <TreeNode
                  key={root.id}
                  node={root}
                  allMembers={members}
                  onEdit={setEditingMember}
                  onDelete={setDeletingMember}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal Edit Anggota */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in duration-200">
          <div className="bg-slate-900/95 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              Edit Anggota Keluarga
            </h3>
            <form onSubmit={handleEditMember} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Nama Lengkap</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  value={editingMember.name}
                  onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                  placeholder="Contoh: Budi Santoso"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Tahun Lahir</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  value={editingMember.birthYear}
                  onChange={(e) => setEditingMember({ ...editingMember, birthYear: e.target.value })}
                  placeholder="1980"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Orang Tua / Induk</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  value={editingMember.parentId || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, parentId: e.target.value || null })}
                >
                  <option value="">-- Akar Utama (Generasi 1) --</option>
                  {members
                    .filter((m) => m.id !== editingMember.id && !isDescendant(m.id, editingMember.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.birthYear ? `(${m.birthYear})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Pasangan (Opsional)</label>
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-blue-500 transition"
                  value={editingMember.spouseId || ''}
                  onChange={(e) => setEditingMember({ ...editingMember, spouseId: e.target.value || null })}
                >
                  <option value="">-- Tanpa Pasangan --</option>
                  {members
                    .filter(
                      (m) =>
                        m.id !== editingMember.id &&
                        !isDescendant(m.id, editingMember.id) &&
                        (!m.spouseId || m.spouseId === editingMember.id)
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.birthYear ? `(${m.birthYear})` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2.5 rounded-lg font-medium text-slate-300 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-xs px-4 py-2.5 rounded-lg font-semibold text-white transition shadow-lg shadow-blue-500/20"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deletingMember && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in duration-200">
          <div className="bg-slate-900/95 border border-slate-800 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Konfirmasi Hapus
            </h3>
            <p className="text-sm text-slate-300 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus <span className="font-semibold text-blue-400">{deletingMember.name}</span> dari silsilah keluarga?
            </p>
            <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-xs text-rose-400 mb-6">
              <strong>Pemberitahuan:</strong> Jika anggota ini memiliki anak/keturunan, mereka tidak akan ikut terhapus, melainkan akan naik ke tingkat atas (Generasi 1) sebagai akar baru.
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2.5 rounded-lg font-medium text-slate-300 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteMember}
                className="bg-rose-600 hover:bg-rose-500 text-xs px-4 py-2.5 rounded-lg font-semibold text-white transition shadow-lg shadow-rose-500/20"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Rekursif Tree Component
function TreeNode({ node, allMembers, onEdit, onDelete }) {
  const spouseNode = allMembers.find((m) => m.id === node.spouseId);
  
  // Gabungkan anak dari kedua orang tua
  const children = allMembers.filter((m) => m.parentId === node.id || (spouseNode && m.parentId === spouseNode.id));

  // Hindari duplikasi jika anak dipasangkan dengan anak lain yang juga dirender di level ini
  const visibleChildren = children.filter((m) => {
    if (m.spouseId) {
      const spouse = children.find((s) => s.id === m.spouseId);
      if (spouse) {
        return m.id < spouse.id; // Render only one as the main sub-tree node
      }
    }
    return true;
  });

  return (
    <div className="border-l-2 border-blue-500/40 pl-4 py-1.5">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        {/* Main Card */}
        <div className="group relative bg-slate-900 border border-slate-700 p-2.5 rounded-xl inline-flex flex-col min-w-[180px] hover:border-blue-500 transition-all duration-200 shadow-md">
          <div className="flex justify-between items-start gap-4">
            <div>
              <p className="font-semibold text-blue-400 text-sm">{node.name}</p>
              {node.birthYear && <p className="text-xs text-slate-400">Tahun Lahir: {node.birthYear}</p>}
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1.5 self-center">
              <button
                onClick={() => onEdit(node)}
                className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-slate-800 transition"
                title="Edit"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(node)}
                className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-800 transition"
                title="Hapus"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Spouse Link and Card */}
        {spouseNode && (
          <>
            <div className="flex items-center justify-center bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs w-6 h-6 rounded-full font-bold shadow-sm animate-pulse" title="Pasangan">
              ❤️
            </div>
            <div className="group relative bg-slate-900 border border-slate-700 p-2.5 rounded-xl inline-flex flex-col min-w-[180px] hover:border-rose-500 transition-all duration-200 shadow-md">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <p className="font-semibold text-rose-400 text-sm">{spouseNode.name}</p>
                  {spouseNode.birthYear && <p className="text-xs text-slate-400">Tahun Lahir: {spouseNode.birthYear}</p>}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1.5 self-center">
                  <button
                    onClick={() => onEdit(spouseNode)}
                    className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-slate-800 transition"
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(spouseNode)}
                    className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-slate-800 transition"
                    title="Hapus"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {visibleChildren.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l border-slate-700/60 pl-3">
          {visibleChildren.map((child) => (
            <TreeNode key={child.id} node={child} allMembers={allMembers} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}