import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto, SetPresenceDto } from '@api/dto/instance.dto';
import { instanceController } from '@api/server.module';
import { ConfigService } from '@config/env.config';
import { instanceSchema, presenceOnlySchema } from '@validate/validate.schema';
import { RequestHandler, Router } from 'express';

import { HttpStatus } from './index.router';

export class InstanceRouter extends RouterBroker {
  constructor(
    readonly configService: ConfigService,
    ...guards: RequestHandler[]
  ) {
    super();
    this.router
      .post('/create', ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: instanceSchema,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.createInstance(instance),
        });

        return res.status(HttpStatus.CREATED).json(response);
      })
      .post(this.routerPath('restart'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.restartInstance(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('connect'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.connectToWhatsapp(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('connectionState'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.connectionState(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .get(this.routerPath('fetchInstances', false), ...guards, async (req, res) => {
        const key = req.get('apikey');

        // dataValidate strips instanceId/instanceName from the query as protected fields.
        // This route has no :instanceName param, so pass the read-only filters explicitly.
        const instanceId = typeof req.query.instanceId === 'string' ? req.query.instanceId : undefined;
        const instanceName = typeof req.query.instanceName === 'string' ? req.query.instanceName : undefined;
        const number = typeof req.query.number === 'string' ? req.query.number : undefined;

        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.fetchInstances({ ...instance, instanceId, instanceName, number }, key),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .post(this.routerPath('setPresence'), ...guards, async (req, res) => {
        const response = await this.dataValidate<null>({
          request: req,
          schema: presenceOnlySchema,
          ClassRef: SetPresenceDto,
          execute: (instance, data) => instanceController.setPresence(instance, data),
        });

        return res.status(HttpStatus.CREATED).json(response);
      })
      .delete(this.routerPath('logout'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.logout(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      })
      .delete(this.routerPath('delete'), ...guards, async (req, res) => {
        const response = await this.dataValidate<InstanceDto>({
          request: req,
          schema: null,
          ClassRef: InstanceDto,
          execute: (instance) => instanceController.deleteInstance(instance),
        });

        return res.status(HttpStatus.OK).json(response);
      });
  }

  public readonly router: Router = Router();
}
