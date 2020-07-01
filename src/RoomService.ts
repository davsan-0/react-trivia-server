import { Question } from './api/opentdb';

export default class RoomService {
  private static instance: RoomService;
  private roomList: RoomList;

  static getInstance(): RoomService {
    if (!RoomService.instance) {
      RoomService.instance = new RoomService();
    }
    return RoomService.instance;
  }

  private constructor() {
    this.roomList = {};
  }

  addUserToRoom = (user: User, room: string) => {
    if (!this.roomList[room]) {
      this.roomList[room] = { users: [user] };
      return;
    }

    this.roomList[room].users = [...this.roomList[room].users, user];
  };

  removeClientWithIdFromRoom = (id: string, room: string) => {
    if (this.roomList[room].users) {
      this.roomList[room].users = this.roomList[room].users.filter(
        (user) => user.id !== id
      );
    }
  };

  getUsersInRoom = (room: string): Array<User> => {
    return this.roomList[room].users;
  };

  getTokenForRoom = (room: string): string | undefined => {
    return this.roomList[room].opentdb_token;
  };

  setTokenForRoom = (room: string, token: string) => {
    this.roomList[room].opentdb_token = token;
    console.log(`Setting token(${room}): ${token}`);
  };

  setCurrentQuestionForRoom = (room: string, question: Question) => {
    this.roomList[room].questions = {
      ...this.roomList[room].questions,
      currentQuestion: question,
    };
  };

  checkAnswerForCurrentQuestion = (room: string, answer: number): boolean => {
    return (
      this.roomList[room].questions?.currentQuestion?.correct_index === answer
    );
  };
}

type RoomList = {
  [room: string]: Room;
};

type Room = {
  users: Array<User>;
  opentdb_token?: string;
  questions?: any;
};

type User = {
  id: string;
  client: any;
};
