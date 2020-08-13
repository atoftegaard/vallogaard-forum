import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DokumenterUploadComponent } from './dokumenter-upload.component';

describe('DokumenterUploadComponent', () => {
  let component: DokumenterUploadComponent;
  let fixture: ComponentFixture<DokumenterUploadComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DokumenterUploadComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DokumenterUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
