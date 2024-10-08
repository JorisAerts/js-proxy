import type { ProxyRequest } from '../../server/ProxyRequest'
import type { ProxyResponse } from '../../server/ProxyResponse'
import type { UrlWithParsedQuery } from 'url'
import { deletePreferences } from '../../utils/os-prefs'
import { responseSuccess } from '../../utils/response-utils'

export const handle = (url: UrlWithParsedQuery, req: ProxyRequest, res: ProxyResponse) => {
  if (url.pathname !== '/api/prefs') return false

  if (req.method === 'DELETE') {
    deletePreferences().then(() => {
      res.statusCode = 200
      res.write(responseSuccess)
      res.end()
    })
    return true
  }

  return false
}
