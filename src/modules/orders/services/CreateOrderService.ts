import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {
    /** */
  }

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const findCustomer = await this.customersRepository.findById(customer_id);

    if (!findCustomer) {
      throw new AppError('Customer not found.');
    }

    const productsFind = await this.productsRepository.findAllById(products);

    if (productsFind.length !== products.length) {
      throw new AppError('Products not found');
    }

    const orderProducts = await this.ordersRepository.create({
      customer: findCustomer,
      products: products.map(product => {
        const idProductOrder = productsFind.find(
          find => find.id === product.id,
        );

        if (!idProductOrder) {
          throw new AppError('Product non-existing');
        }

        if (idProductOrder && idProductOrder.quantity < product.quantity) {
          throw new AppError('No have product in stock');
        }

        idProductOrder.quantity -= product.quantity;

        return {
          product_id: idProductOrder.id,
          quantity: product.quantity,
          price: idProductOrder.price,
        };
      }),
    });

    await this.productsRepository.updateQuantity(products);

    return orderProducts;
  }
}

export default CreateOrderService;
