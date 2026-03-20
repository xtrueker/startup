import mongoose from 'mongoose';
import Camera from './src/infrastructure/database/models/Camera';

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/red-ciudadana');
  const cameras = await Camera.find({});
  console.log(JSON.stringify(cameras, null, 2));
  process.exit(0);
}
run();
