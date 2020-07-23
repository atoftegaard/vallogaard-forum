import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferatUploadComponent } from './referat-upload.component';

describe('ReferatUploadComponent', () => {
  let component: ReferatUploadComponent;
  let fixture: ComponentFixture<ReferatUploadComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReferatUploadComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReferatUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
