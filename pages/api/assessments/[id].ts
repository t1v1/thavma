import { NextApiRequest as Req, NextApiResponse as Res } from 'next';
import cors from 'cors';

import { APIError, Assessment } from 'lib/model';
import handle from 'lib/api/handle';
import logger from 'lib/api/logger';
import middleware from 'lib/api/middleware';
import supabase from 'lib/api/supabase';

export default async function assessmentAPI(req: Req, res: Res): Promise<void> {
  try {
    await middleware(req, res, cors());
    if (typeof req.query.id !== 'string') throw new APIError('No ID', 400);
    const { user } = await supabase.auth.api.getUserByCookie(req);
    if (!user) throw new APIError('No authentication cookie', 401);
    switch (req.method) {
      case 'GET': {
        logger.info(`Selecting assessment (${req.query.id})...`);
        const { data, error } = await supabase
          .from<Assessment>('assessments')
          .select()
          .eq('id', Number(req.query.id));
        if (error) throw new APIError(error.message, 500);
        if (!data?.length) throw new APIError('No assessment data', 500);
        res.status(200).json(data[0]);
        break;
      }
      case 'PATCH': {
        logger.info(`Updating assessment (${req.query.id})...`);
        const { data, error } = await supabase
          .from<Assessment>('assessments')
          .update(req.body)
          .eq('id', Number(req.query.id));
        if (error) throw new APIError(error.message, 500);
        if (!data?.length) throw new APIError('No assessment data', 500);
        res.status(200).json(data[0]);
        break;
      }
      default:
        res.setHeader('Allow', ['GET', 'PATCH']);
        res.status(405).end(`Method ${req.method as string} Not Allowed`);
    }
  } catch (e) {
    handle(e, res);
  }
}
