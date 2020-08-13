import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralforsamlingPreviewComponent } from './generalforsamling-preview.component';

describe('GeneralforsamlingPreviewComponent', () => {
  let component: GeneralforsamlingPreviewComponent;
  let fixture: ComponentFixture<GeneralforsamlingPreviewComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ GeneralforsamlingPreviewComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(GeneralforsamlingPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
