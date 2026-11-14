<?php

namespace App\Http\Responses;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Laravel\Fortify\Contracts\LoginResponse;
use Laravel\Fortify\Fortify;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Returns to the page remembered before login only when the new user's role may open it;
 * otherwise a different account signing in after an expired session lands on a 403.
 */
class RoleAwareLoginResponse implements LoginResponse
{
    public function __construct(private Router $router) {}

    /**
     * @param  Request  $request
     */
    public function toResponse($request): Response
    {
        if ($request->wantsJson()) {
            return new JsonResponse(['two_factor' => false]);
        }

        $home = Fortify::redirects('login');
        $intended = $request->session()->pull('url.intended');
        /** @var User $user */
        $user = $request->user();

        return redirect()->to(is_string($intended) && $this->roleMayOpen($user, $intended) ? $intended : $home);
    }

    private function roleMayOpen(User $user, string $url): bool
    {
        try {
            $route = $this->router->getRoutes()->match(Request::create($url));
        } catch (Throwable) {
            return false;
        }

        foreach ($route->gatherMiddleware() as $middleware) {
            if (is_string($middleware) && str_starts_with($middleware, 'role:')) {
                return in_array($user->role->value, explode(',', substr($middleware, 5)), true);
            }
        }

        return true;
    }
}
