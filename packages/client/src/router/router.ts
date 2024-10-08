import { createRouter, createWebHashHistory } from 'vue-router'
import { RouteNames } from './RouteNames'
import { Error404, ErrorLog, ErrorLogControlsToolbar, ErrorWsDown, Information, InformationControlsToolbar, Request, RequestControlsToolbar } from '../views'
import type { UUID } from 'lopr-shared'
import { useCache } from '../stores/cache'
import { useRequestStore } from '../stores/request'

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      name: RouteNames.Requests,
      path: '/',
      components: {
        default: Request,
        controls: RequestControlsToolbar,
      },
      beforeEnter: (to) => {
        useRequestStore().filter = to.query.q as string
      },

      children: [
        {
          name: RouteNames.RequestDetails,
          path: 'r/:uuid?',
          components: {
            default: Request,
            controls: RequestControlsToolbar,
          },
          beforeEnter: (to) => {
            useCache().current = to.params.uuid as UUID
          },
        },
      ],
    },

    {
      name: RouteNames.Information,
      path: '/info',
      components: {
        default: Information,
        controls: InformationControlsToolbar,
      },
    },

    {
      name: RouteNames.ErrorLog,
      path: '/error-log',
      components: {
        default: ErrorLog,
        controls: ErrorLogControlsToolbar,
      },
    },

    {
      name: RouteNames.Error404,
      path: '/error/404',
      components: {
        default: Error404,
      },
    },

    {
      name: RouteNames.ErrorWsDown,
      path: '/error/black-hawk-down',
      components: {
        default: ErrorWsDown,
      },
    },

    {
      path: '/:pathMatch(.*)*',
      redirect: (to) => {
        return { name: RouteNames.Error404, query: { p: to.fullPath }, params: {} }
      },
    },
  ],
})

export const pushRoute = (...args: Parameters<(typeof router)['push']>) => router.push(...args)
