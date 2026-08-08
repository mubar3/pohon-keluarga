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
            };
            currentData.members.push(newMember);
            return NextResponse.json({ message: 'Anggota berhasil ditambahkan', member: newMember });
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