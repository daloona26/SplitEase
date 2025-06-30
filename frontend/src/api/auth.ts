import  bcrypt from 'bcryptjs';

export interface User {
  id: string;
  name: string;
  email: string;
  isSubscribed: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

class AuthAPI {
  private users: Array<User & { password: string }> = [];

  async login(data: LoginData): Promise<User> {
    const user = this.users.find(u => u.email === data.email);
    if (!user || !bcrypt.compareSync(data.password, user.password)) {
      throw new Error('Invalid credentials');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async signup(data: SignupData): Promise<User> {
    if (this.users.find(u => u.email === data.email)) {
      throw new Error('Email already exists');
    }
    
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const user = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      password: hashedPassword,
      isSubscribed: false
    };
    
    this.users.push(user);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export const authAPI = new AuthAPI();
 