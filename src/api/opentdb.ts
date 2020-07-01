import axios from 'axios';
import he from 'he';
import RoomService from '../RoomService';
import shortid from 'shortid';
import _ from 'lodash';
import { AsyncLocalStorage } from 'async_hooks';

const opentdb = axios.create({
  baseURL: 'https://opentdb.com',
});
/*if (!localStorage.getItem('opentdb_token')) {
  opentdb.get('/api_token.php?command=request').then((res) => {
    if (res.data.response_code === 0) {
      localStorage.setItem('opentdb_token', res.data.token);
    }
  });
}*/

export const fetchQuestions = async ({
  amount,
  room,
  difficulty,
  categoryId,
  type,
}: {
  amount: number;
  room: string;
  difficulty?: Difficulty;
  categoryId?: number;
  type?: QuestionType;
}) => {
  const amountStr = `amount=${amount}`;
  const categoryStr = categoryId ? `&category=${categoryId}` : '';
  const difficultyStr = difficulty ? `&difficulty=${difficulty}` : '';
  const typeStr = type ? `&type=${type}` : '';

  let token = RoomService.getInstance().getTokenForRoom(room);
  if (!token) {
    const res = await opentdb.get('/api_token.php?command=request');
    if (res.data.response_code === 0) {
      RoomService.getInstance().setTokenForRoom(room, res.data.token);
      token = res.data.token;
    }
  }
  const tokenStr = `&token=${token}`;

  const queryStr = amountStr + categoryStr + difficultyStr + typeStr + tokenStr;

  return opentdb.get(`/api.php?${queryStr}`).then((res) => {
    const questions = res.data.results;
    return questions.map((q: any) => {
      q.id = shortid.generate();
      q.question = he.decode(q.question);

      const incorrect_answers = _.shuffle(q.incorrect_answers);

      // Inserts correct answer into random index among incorrect_answers
      const ansIndex = Math.floor(Math.random() * 4);
      q.answers = incorrect_answers
        .slice(0, ansIndex)
        .concat(q.correct_answer)
        .concat(incorrect_answers.slice(ansIndex, incorrect_answers.length))
        .map((str) => he.decode(str));
      q.correct_index = ansIndex;

      const question = _.omit<Question>(
        q,
        'incorrect_answers',
        'correct_answer'
      );

      return question;
    });
  });
};

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export enum QuestionType {
  MULTIPLE = 'multiple',
  BOOLEAN = 'boolean',
}

export type Question = {
  id: string;
  category: string;
  type: QuestionType;
  difficulty: Difficulty;
  question: string;
  answers: Array<string>;
  correct_index: number;
};

export type Answer = {
  question_id: string;
  answer: number;
};
