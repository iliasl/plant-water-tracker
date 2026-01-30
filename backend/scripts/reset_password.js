#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const prisma = new PrismaClient();

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data.trim()));
  });
}

async function promptHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin;
    process.stdout.write(query);
    stdin.resume();
    stdin.setRawMode(true);
    let input = '';
    stdin.on('data', (ch) => {
      const char = ch + '';
      if (char === '\r' || char === '\n' || char === '\u0004') {
        process.stdout.write('\n');
        stdin.setRawMode(false);
        rl.close();
        resolve(input);
      } else if (char === '\u0003') { // Ctrl-C
        process.stdout.write('\n');
        process.exit(1);
      } else if (char === '\u007f') { // backspace
        if (input.length > 0) input = input.slice(0, -1);
      } else {
        input += char;
      }
    });
  });
}

async function main() {
  const email = process.argv[2];
  const passwordArg = process.argv[3];

  if (!email) {
    console.error('Usage: reset_password.js <email> [newPassword]');
    process.exit(2);
  }

  let password = passwordArg;

  if (!password) {
    // If stdin is piped, read password from stdin
    if (!process.stdin.isTTY) {
      password = await readStdin();
    } else {
      // Interactive hidden prompt
      password = await promptHidden('New password: ');
      const confirm = await promptHidden('Confirm password: ');
      if (password !== confirm) {
        console.error('Passwords do not match');
        process.exit(3);
      }
    }
  }

  if (!password || password.length < 6) {
    console.error('Password must be at least 6 characters');
    process.exit(4);
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error('User not found:', email);
      process.exit(5);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.user.update({ where: { email }, data: { passwordHash } });
    console.log('Password updated for', email);
    process.exit(0);
  } catch (err) {
    console.error('Error updating password:', err);
    process.exit(6);
  } finally {
    await prisma.$disconnect();
  }
}

main();
