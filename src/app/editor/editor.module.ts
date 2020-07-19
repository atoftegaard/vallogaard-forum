import { NgModule } from '@angular/core';
import { EditorComponent } from './editor.component';
import { EditableArticleResolver } from './editable-article-resolver.service';
import { SharedModule } from '../shared';
import { EditorRoutingModule } from './editor-routing.module';
import { EditorModule as PrimeEditorModule} from 'primeng/editor';

@NgModule({
  imports: [
    SharedModule,
     EditorRoutingModule,
     PrimeEditorModule
    ],
  declarations: [EditorComponent],
  providers: [EditableArticleResolver],
  exports: [
  ]
})
export class EditorModule {}
