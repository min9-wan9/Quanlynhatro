import express from 'express';
import cors from 'cors';
import roomsRouter from './modules/rooms/rooms.routes';
import invoicesRouter from './modules/invoices/invoices.routes';
import paymentsRouter from './modules/payments/payments.routes';
import chatRouter from './modules/chat/chat.routes';
import usersRouter from './modules/users/users.routes';
import contractsRouter from './modules/contracts/contracts.routes';
import issuesRouter from './modules/issues/issues.routes';
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/rooms', roomsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/users', usersRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/issues', issuesRouter);
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

export default app;
