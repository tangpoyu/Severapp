import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { BehaviorSubject, catchError, map, Observable, of, startWith } from 'rxjs';
import { DataState } from './enum/data.state.enum';
import { Status } from './enum/status.enum';
import { AppState } from './interface/app-state';
import { CustomResponse } from './interface/constom.reponse';
import { Server } from './interface/server';
import { NotificaionService } from './service/notificaion.service';
import { ServerService } from './service/server.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  title = 'serverapp';
  appState$: Observable<AppState<CustomResponse>>
  readonly dataState= DataState
  readonly status = Status
  private filterSubject = new BehaviorSubject<string>("")
  private dataSubjcet = new BehaviorSubject<CustomResponse>(null)
  filterStatus$ = this.filterSubject.asObservable()
  private isLoading = new BehaviorSubject<boolean>(false)
  isLoading$ = this.isLoading.asObservable()


  constructor(private serverService: ServerService, private notificationService: NotificaionService) {}

  ngOnInit(): void {
    this.appState$ = this.serverService.servers$
      .pipe(
        map(reponse => {
          this.notificationService.onInfo(reponse.message)
          this.dataSubjcet.next(reponse)
          return {
            dataState: DataState.LOADED, appData: reponse
          }
        }
        ),
        startWith({ dataState: DataState.LOADING }),
        catchError((error: string) => {
          this.notificationService.onError(error)
          return of({ dataState: DataState.ERROR, error })
        })
      )
  }
  
  pingServer(ipAddress: string): void {
    this.filterSubject.next(ipAddress)
    this.appState$ = this.serverService.ping$(ipAddress)
      .pipe(
        map(reponse => {
          this.notificationService.onInfo(reponse.message)
          this.dataSubjcet.value.data.servers[
            this.dataSubjcet.value.data.servers.findIndex( server => server.id === reponse.data.server.id)
          ].status = reponse.data.server.status
          this.filterSubject.next('')
          return {
            dataState: DataState.LOADED, appData:this.dataSubjcet.value
          }
        }
        ),
        startWith({ dataState: DataState.LOADED, appData:this.dataSubjcet.value }),
        catchError((error: string) => {
          this.notificationService.onError(error)
          this.filterSubject.next('')
          return of({ dataState: DataState.ERROR, error })
        })
      )
  }

  filterServer(status: any): void {
    const filter_value = status.target.value
    this.appState$ = this.serverService.filter$(filter_value, this.dataSubjcet.value)
      .pipe(
        map(reponse => {
          this.notificationService.onInfo(reponse.message)
          return {
            dataState: DataState.LOADED, appData: reponse
          }
        }
        ),
        startWith({ dataState: DataState.LOADED, appData:this.dataSubjcet.value }),
        catchError((error: string) => {
          this.notificationService.onError(error)
          return of({ dataState: DataState.ERROR, error })
        })
      )
  }

   
  saveServer(serverForm: NgForm): void {
    this.isLoading.next(true)
    this.appState$ = this.serverService.save$(serverForm.value)
      .pipe(
        map(reponse => {
          this.notificationService.onInfo(reponse.message)
          this.dataSubjcet.next(
            {...reponse, data:{ servers:[reponse.data.server,...this.dataSubjcet.value.data.servers]}}
          )
          document.getElementById('closeModal').click()
          serverForm.reset({status: this.status.SERVER_DOWN})
          this.isLoading.next(false)
          return {
            dataState: DataState.LOADED, appData:this.dataSubjcet.value
          }
        }
        ),
        startWith({ dataState: DataState.LOADED, appData:this.dataSubjcet.value }),
        catchError((error: string) => {
          this.notificationService.onError(error)
          this.isLoading.next(false)
          return of({ dataState: DataState.ERROR, error })
        })
      )
  }

  deleteServer(server: Server): void {

    this.appState$ = this.serverService.delete$(server.id)
      .pipe(
        map(reponse => {
          this.notificationService.onInfo(reponse.message)
          this.dataSubjcet.next({
            ...reponse, data:{servers:this.dataSubjcet.value.data.servers.filter(s => s.id !== server.id)}
          })
          console.log(this.dataSubjcet.value)
          return {
            dataState: DataState.LOADED, appData: this.dataSubjcet.value
          }
        }
        ),
        startWith({ dataState: DataState.LOADED, appData:this.dataSubjcet.value }),
        catchError((error: string) => {
          this.notificationService.onError(error)
          return of({ dataState: DataState.ERROR, error })
        })
      )
  }

  printReport() : void {
    // window.print() save as pdf
    this.notificationService.onInfo("gets excel file")
    let tabelSelect = document.getElementById('servers')
    let tableHtml = tabelSelect.outerHTML.replace(/ /g,'%20') 
    let downloadLink = document.createElement('a')
    document.body.appendChild(downloadLink)
    downloadLink.href = 'data:application/vnd.ms-excel.sheet.macroEnabled.12, ' + tableHtml
    downloadLink.download = 'server-report.xls'
    downloadLink.click()
    document.body.removeChild(downloadLink)
  }

}



