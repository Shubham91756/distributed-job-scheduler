import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');
    
    // Seed initial admin user if it doesn't exist
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@codity.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
    
    const existingAdmin = await prisma.user.findUnique({
        where: { email: adminEmail }
    });

    let adminId: string;
    
    if (!existingAdmin) {
        console.log(`Creating admin user: ${adminEmail}`);
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                passwordHash: hashedPassword,
                name: 'System Admin',
                role: 'ADMIN',
                emailVerified: true
            }
        });
        adminId = admin.id;
    } else {
        console.log('Admin user already exists.');
        adminId = existingAdmin.id;
    }

    // Seed default organization
    const defaultOrg = await prisma.organization.upsert({
        where: { slug: 'system-default' },
        update: {},
        create: {
            name: 'System Default',
            slug: 'system-default',
            ownerId: adminId
        }
    });

    console.log('Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error('Error during seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
