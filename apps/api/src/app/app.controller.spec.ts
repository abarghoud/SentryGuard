import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let service: AppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = module.get<AppController>(AppController);
    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getData', () => {
    it('should return "Hello API"', () => {
      const result = controller.getData();
      expect(result).toEqual({ message: 'Hello API' });
    });

    it('should call AppService.getData', () => {
      const getDataSpy = jest.spyOn(service, 'getData');
      controller.getData();
      expect(getDataSpy).toHaveBeenCalled();
    });

    it('should return the same result as AppService.getData', () => {
      const serviceResult = service.getData();
      const controllerResult = controller.getData();
      expect(controllerResult).toEqual(serviceResult);
    });
  });
});
