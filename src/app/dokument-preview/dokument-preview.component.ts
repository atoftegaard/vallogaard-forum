import { Component, OnInit, Input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Dokument } from '../core/models/dokument.model';

@Component({
  selector: 'app-dokument-preview',
  templateUrl: './dokument-preview.component.html',
  styleUrls: ['./dokument-preview.component.css'],
  providers: [DatePipe]
})
export class DokumentPreviewComponent implements OnInit {
  @Input() dokument: Dokument;

  constructor(
    private datePipe: DatePipe) { }

  toLongDate(date: any) {
    return this.datePipe.transform(date, 'longDate');
  }

  ngOnInit(): void {
  }

}
