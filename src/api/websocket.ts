import RoomService from '../RoomService';
import WebSocket from 'ws';
import _ from 'lodash';
import shortid from 'shortid';
import database from '../database/db';
import {
  fetchQuestions,
  Difficulty,
  Question,
  QuestionType,
  Answer,
} from './opentdb';

export default class WebSocketService {
  wss: WebSocket.Server;
  roomService: RoomService;

  constructor({ port }: { port: number }) {
    this.wss = new WebSocket.Server({ port });

    this.roomService = RoomService.getInstance();

    this.wss.on('connection', (ws: WebSocket) => {
      let userId: string;
      let roomCode: string;

      console.log(`connection established`);

      ws.on('message', (message: string) => {
        const msg = JSON.parse(message);
        console.log(`Received from user ${userId}: ${message}`);
        switch (msg.type) {
          case 'connect':
            userId = msg.userId ? msg.userId : shortid.generate();
            roomCode = msg.code;
            const userObj = { id: userId, client: ws };

            database.then((db: any) => {
              let users = db.get('rooms').get(msg.code, {}).get('users', []);

              if (!users.find({ id: userId }).value()) {
                users.push(userObj).write();
              }
            });

            this.roomService.addUserToRoom(userObj, roomCode);

            const connectMsgObj = { type: 'connect', userId, code: msg.code };
            const connectMsgStr = JSON.stringify(connectMsgObj);
            console.log(`Sending: ${connectMsgStr}`);
            ws.send(connectMsgStr);
            break;
          case 'broadcast':
            /*database.then((db) => {
              let users = db
                .get('rooms')
                .get(roomCode, {})
                .get('users', [])
                .value();

              users.forEach((user) => {
                console.log('user:0 ', user);
                const broadcastMsgObj = {
                  type: 'broadcast',
                  userId,
                  code: msg.code,
                };
                const broadcastMsgStr = JSON.stringify(broadcastMsgObj);
                user.client.send(broadcastMsgStr);
              });
            });*/
            this.broadcastToRoom(roomCode, {
              type: 'broadcast',
              message: 'test',
            });
            break;
          case 'question':
            fetchQuestions({
              amount: 1,
              room: roomCode,
              type: QuestionType.MULTIPLE,
            }).then((q) => this.sendQuestionToRoom(roomCode, q[0]));
            break;
          case 'answer':
            const answer = msg.message as Answer;
            const isCorrect = this.roomService.checkAnswerForCurrentQuestion(
              roomCode,
              answer.answer
            );

            const response = {
              type: 'answer',
              message: { question_id: answer.question_id, isCorrect },
            };

            ws.send(JSON.stringify(response));
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`${userId} exited with code ${code} and reason: ${reason}`);

        database.then((db: any) => {
          db.get('rooms')
            .get(roomCode, {})
            .get('users', [])
            .remove({ id: userId })
            .write()
            .then((val: string) => console.log(val));
        });

        this.roomService.removeClientWithIdFromRoom(userId, roomCode);
      });
    });
  }

  sendQuestionToRoom = (room: string, question: Question) => {
    this.roomService.setCurrentQuestionForRoom(room, question);

    const q = _.omit(question, 'correct_index');

    this.broadcastToRoom(room, {
      type: 'question',
      message: JSON.stringify(q),
    });
  };

  broadcastToRoom = (room: string, message: object) => {
    const users = this.roomService.getUsersInRoom(room);
    const msgStr = JSON.stringify(message);
    console.log(`Broadcasting(${room}): ${msgStr}`);
    users.forEach((user: any) => {
      user.client.send(msgStr);
    });
  };
}
