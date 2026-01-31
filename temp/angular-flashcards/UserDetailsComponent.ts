import { AsyncPipe, NgIf } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { catchError, distinctUntilChanged, map, of, switchMap, tap } from "rxjs";

type User = {
  id: string;
  name: string;
  email?: string;
};

@Component({
  selector: "app-user-details",
  standalone: true,
  imports: [NgIf, AsyncPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <h1>User details</h1>

      <p *ngIf="isLoading()">Loading user…</p>
      <p *ngIf="error()" role="alert">Error: {{ error() }}</p>

      <ng-container *ngIf="user$ | async as user">
        <dl *ngIf="user">
          <dt>ID</dt>
          <dd>{{ user.id }}</dd>

          <dt>Name</dt>
          <dd>{{ user.name }}</dd>

          <ng-container *ngIf="user.email">
            <dt>Email</dt>
            <dd>{{ user.email }}</dd>
          </ng-container>
        </dl>
      </ng-container>
    </section>
  `,
})
export class UserDetailsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly error = signal<string | null>(null);
  readonly isLoading = signal(false);

  readonly user$ = this.route.paramMap.pipe(
    map((pm) => pm.get("userId")),
    distinctUntilChanged(),
    tap(() => {
      this.error.set(null);
      this.isLoading.set(true);
    }),
    switchMap((userId) => {
      if (!userId) {
        this.isLoading.set(false);
        this.error.set("Missing route param: userId");
        return of(null);
      }

      return this.http
        .get<User>(`/api/users/${encodeURIComponent(userId)}`)
        .pipe(
          catchError((e: unknown) => {
            const message = e instanceof Error ? e.message : "Request failed";
            this.error.set(message);
            return of(null);
          })
        );
    }),
    tap(() => {
      this.isLoading.set(false);
    })
  );
}
