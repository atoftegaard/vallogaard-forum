import { NgModule } from '@angular/core';
import { Routes, RouterModule, PreloadAllModules } from '@angular/router';

const routes: Routes = [
  {
    path: 'settings',
    loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule)
  },
  {
    path: 'brugere',
    loadChildren: () => import('./brugere/brugere.module').then(m => m.BrugereModule)
  },
  {
    path: 'medlemmer',
    loadChildren: () => import('./medlemmer/medlemmer.module').then(m => m.MedlemmerModule)
  },
  {
    path: 'editor',
    loadChildren: () => import('./editor/editor.module').then(m => m.EditorModule)
  },
  {
    path: 'article',
    loadChildren: () => import('./article/article.module').then(m => m.ArticleModule)
  },
  {
    path: 'referater',
    loadChildren: () => import('./referater/referater.module').then(m => m.ReferaterModule)
  },
  {
    path: 'dokumenter',
    loadChildren: () => import('./dokumenter/dokumenter.module').then(m => m.DokumenterModule)
  },
  {
    path: 'lejlighedsoverblik',
    loadChildren: () => import('./lejlighedsoverblik/lejlighedsoverblik.module').then(m => m.LejlighedsoverblikModule)
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    // preload all modules; optionally we could
    // implement a custom preloading strategy for just some
    // of the modules (PRs welcome 😉)
    // enableTracing: true,
    preloadingStrategy: PreloadAllModules
  })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
