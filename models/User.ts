import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'donor' | 'ngo' | 'volunteer' | 'admin';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  phone: string;
  address: string;
  /** GeoJSON Point — coordinates: [lng, lat] */
  location?: {
    type: string;
    coordinates: [number, number];
  };
  /** Volunteer only: per-km rate in INR (default 10) */
  pricePerKm?: number;
  /** Volunteer only: average rating out of 5 */
  rating?: number;
  /** Volunteer only: whether they are currently available for task assignment */
  isAvailable?: boolean;
  /** Wallet balance in INR — NGO pays, volunteer receives */
  walletBalance: number;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['donor', 'ngo', 'volunteer', 'admin'], required: true },
  isActive: { type: Boolean, default: true, index: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number] },
  },
  pricePerKm: { type: Number, min: 1, max: 200, default: 10 },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  isAvailable: { type: Boolean, default: true },
  walletBalance: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index({ location: '2dsphere' });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
