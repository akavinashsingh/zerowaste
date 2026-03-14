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
  createdAt: { type: Date, default: Date.now },
});

UserSchema.index({ location: '2dsphere' });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
