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
      path: '/features',
      name: 'Features',
      component: () => import('../components/FeaturesHub.vue'),
    },
    {
      path: '/gallery',
      name: 'Gallery',
      component: () => import('../components/CardGallery.vue'),
    },
    {
      path: '/signature',
      name: 'Signature',
      component: () => import('../components/SignaturePad.vue'),
    },
    {
      path: '/timeline',
      name: 'Timeline',
      component: () => import('../components/Timeline.vue'),
    },
  ],
})

export default router
