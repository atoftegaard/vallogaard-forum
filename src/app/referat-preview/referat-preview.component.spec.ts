import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ReferatPreviewComponent } from './referat-preview.component';

describe('ReferatPreviewComponent', () => {
  let component: ReferatPreviewComponent;
  let fixture: ComponentFixture<ReferatPreviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ReferatPreviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ReferatPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
