import { NextResponse } from 'next/server';
import initialData from '@/data/family.json';

// Simple in-memory fallback
let currentData = { ...initialData };

export async function GET() {
    return NextResponse.json(currentData);
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Jika request membawa full state (misal import JSON)
        if (body.action === 'IMPORT') {
            currentData = body.data;
            return NextResponse.json({ message: 'Data berhasil diperbarui', data: currentData });
        }

        // Jika request menambah anggota keluarga baru
        if (body.action === 'ADD_MEMBER') {
            const newMember = {
                id: Date.now().toString(),
                name: body.name,
                birthYear: body.birthYear || '',
                parentId: body.parentId || null,
                spouseId: body.spouseId || null,
            };
            currentData.members.push(newMember);

            // Jika ada pasangan yang dipilih, pasangkan timbal-balik
            if (newMember.spouseId) {
                const spouseIndex = currentData.members.findIndex((m) => m.id === newMember.spouseId);
                if (spouseIndex !== -1) {
                    // Putuskan pasangan lama jika pasangan baru ini sudah punya pasangan
                    const prevSpouseId = currentData.members[spouseIndex].spouseId;
                    if (prevSpouseId) {
                        const prevSpouseIndex = currentData.members.findIndex((m) => m.id === prevSpouseId);
                        if (prevSpouseIndex !== -1) {
                            currentData.members[prevSpouseIndex].spouseId = null;
                        }
                    }
                    currentData.members[spouseIndex].spouseId = newMember.id;
                }
            }

            return NextResponse.json({ message: 'Anggota berhasil ditambahkan', member: newMember });
        }

        // Jika request mengedit anggota keluarga
        if (body.action === 'EDIT_MEMBER') {
            const { id, name, birthYear, parentId, spouseId } = body;
            const index = currentData.members.findIndex((m) => m.id === id);
            if (index === -1) {
                return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
            }

            // Validasi pencegahan siklus silsilah jika parentId dirubah
            if (parentId) {
                if (parentId === id) {
                    return NextResponse.json({ error: 'Tidak dapat menjadikan diri sendiri sebagai orang tua' }, { status: 400 });
                }
                
                // Cek apakah parent baru adalah keturunan dari anggota yang sedang diedit
                const isDescendant = (potentialParentId, targetMemberId) => {
                    if (!potentialParentId) return false;
                    if (potentialParentId === targetMemberId) return true;
                    const parent = currentData.members.find((m) => m.id === potentialParentId);
                    if (!parent) return false;
                    return isDescendant(parent.parentId, targetMemberId);
                };

                if (isDescendant(parentId, id)) {
                    return NextResponse.json({ error: 'Tidak dapat menjadikan keturunan sendiri sebagai orang tua' }, { status: 400 });
                }
            }

            const oldSpouseId = currentData.members[index].spouseId;
            const newSpouseId = spouseId || null;

            // Jika hubungan pasangan berubah
            if (oldSpouseId !== newSpouseId) {
                // Putuskan pasangan lama (jika ada)
                if (oldSpouseId) {
                    const oldSpouseIndex = currentData.members.findIndex((m) => m.id === oldSpouseId);
                    if (oldSpouseIndex !== -1) {
                        currentData.members[oldSpouseIndex].spouseId = null;
                    }
                }

                // Hubungkan pasangan baru (jika ada)
                if (newSpouseId) {
                    const newSpouseIndex = currentData.members.findIndex((m) => m.id === newSpouseId);
                    if (newSpouseIndex !== -1) {
                        // Putuskan pasangan dari pasangan baru (jika ada)
                        const newSpousesPrevSpouseId = currentData.members[newSpouseIndex].spouseId;
                        if (newSpousesPrevSpouseId) {
                            const prevSpouseOfNewSpouseIndex = currentData.members.findIndex((m) => m.id === newSpousesPrevSpouseId);
                            if (prevSpouseOfNewSpouseIndex !== -1) {
                                currentData.members[prevSpouseOfNewSpouseIndex].spouseId = null;
                            }
                        }
                        currentData.members[newSpouseIndex].spouseId = id;
                    }
                }
            }

            currentData.members[index] = {
                ...currentData.members[index],
                name: name,
                birthYear: birthYear || '',
                parentId: parentId || null,
                spouseId: newSpouseId,
            };

            return NextResponse.json({ message: 'Anggota berhasil diperbarui', member: currentData.members[index] });
        }

        // Jika request menghapus anggota keluarga
        if (body.action === 'DELETE_MEMBER') {
            const { id } = body;
            const index = currentData.members.findIndex((m) => m.id === id);
            if (index === -1) {
                return NextResponse.json({ error: 'Anggota tidak ditemukan' }, { status: 404 });
            }

            const deletedMember = currentData.members[index];

            // Hubungan pasangan: bersihkan spouseId dari pasangan yang ditinggalkan
            if (deletedMember.spouseId) {
                const spouseIndex = currentData.members.findIndex((m) => m.id === deletedMember.spouseId);
                if (spouseIndex !== -1) {
                    currentData.members[spouseIndex].spouseId = null;
                }
            }

            // Hapus anggota
            currentData.members.splice(index, 1);

            // Perbarui semua anak-anaknya agar parentId mereka menjadi null
            currentData.members = currentData.members.map((m) => {
                if (m.parentId === id) {
                    return { ...m, parentId: null };
                }
                return m;
            });

            return NextResponse.json({ message: 'Anggota berhasil dihapus' });
        }

        // Auth Login
        if (body.action === 'LOGIN') {
            const user = currentData.users.find(
                (u) => u.username === body.username && u.password === body.password
            );
            if (!user) {
                return NextResponse.json({ error: 'Username/Password salah' }, { status: 401 });
            }
            return NextResponse.json({ message: 'Login berhasil', username: user.username });
        }

        // Auth Register
        if (body.action === 'REGISTER') {
            const exists = currentData.users.find((u) => u.username === body.username);
            if (exists) {
                return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
            }
            const newUser = { username: body.username, password: body.password };
            currentData.users.push(newUser);
            return NextResponse.json({ message: 'Register berhasil' });
        }

        return NextResponse.json({ error: 'Action tidak dikenal' }, { status: 400 });
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}