import { TestBed } from '@angular/core/testing';

import { BaseRepositoryService } from './base-repository.service';

describe('BaseRepositoryService', () => {
  let service: BaseRepositoryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BaseRepositoryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
