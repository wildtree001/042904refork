import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('../components/BlogHome.vue'),
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('../components/AboutMe.vue'),
    },
    {
      path: '/details',
      name: 'Details',
      component: () => import('../components/DetailsPage.vue'),
    },
    {
      path: '/explore',
      name: 'Explore',
      component: () => import('../components/DeepExplore.vue'),
    },
    {
      path: '/music',
      name: 'MusicPlayer',
      component: () => import('../components/MusicPlayer.vue'),
    },
    {
      path: '/globe',
      name: 'Globe3D',
      component: () => import('../components/Globe3D.vue'),
    },
    {
      path: '/whiteboard',
      name: 'Whiteboard',
      component: () => import('../components/Whiteboard.vue'),
    },
  ],
})

export default router
