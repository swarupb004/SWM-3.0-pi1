import { hash } from 'bcrypt';
import { getConnection } from 'typeorm';
import { User } from './entities/User'; // Adjust the path according to your project structure

async function migrateHashPasswords() {
    const connection = await getConnection();
    const userRepository = connection.getRepository(User);

    // Fetch all users with plain text passwords
    const users = await userRepository.find();

    for (const user of users) {
        if (user.password && !user.password.startsWith('$2b$')) { // Check if password is not hashed
            // Hash the plain text password
            user.password = await hash(user.password, 10);
            console.log(`Hashing password for user: ${user.email}`);
            // Save the updated user
            await userRepository.save(user);
        }
    }

    console.log('Password migration completed.');
}

migrateHashPasswords().catch(console.error);