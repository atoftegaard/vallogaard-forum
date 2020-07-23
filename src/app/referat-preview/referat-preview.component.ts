import { Component, OnInit, Input } from '@angular/core';
import { Referat } from '../core/models/referat.model';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-referat-preview',
  templateUrl: './referat-preview.component.html',
  styleUrls: ['./referat-preview.component.css'],
  providers: [DatePipe]
})
export class ReferatPreviewComponent implements OnInit {
  @Input() referat: Referat;

  constructor(
    private datePipe: DatePipe) { }

  toLongDate(date: any) {
    return this.datePipe.transform(date.toDate(), 'longDate');
  }

  ngOnInit(): void {

  }

}
